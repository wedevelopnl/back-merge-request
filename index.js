const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = process.env.PORT || 3000

process.loadEnvFile('./.env');

const config = {
    apiUrl: process.env.API_URL || 'https://gitlab.com/api/v4',
    apiToken: process.env.API_TOKEN,
    apiMergeDelayInMilliseconds: process.env.API_MERGE_DELAY_IN_MILLISECONDS || 1000,
    backMergeConfigKey: process.env.BACK_MERGE_CONFIG_KEY || 'BACK_MERGE_CONFIG',
}

app.use(bodyParser.json())

app.get('/health', (req, res) => {
    return res.send('OK');
})

app.post('/api/v1/back-merge', (req, res) => {
    const jobToken = req.body.jobToken;

    if (!jobToken) {
        return res.status(400).json({ message: 'Missing job token' });
    }

    fetch(config.apiUrl + '/job', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + jobToken,
        },
    }).then(gitResponse => {
        if (!gitResponse.ok) {
            return Promise.reject(new Error('Invalid job token'));
        }

        return gitResponse.json();
    }).then(async jobResponse => {
        if (jobResponse.pipeline.status !== 'running') {
            return Promise.reject(new Error('Job is no longer running'));
        }

        let projectBackMergeConfig;
        try {
            projectBackMergeConfig = await getProjectBackMergeConfig(jobResponse.pipeline.project_id);
        } catch (err) {
            return Promise.reject(new Error('No back merge config found'));
        }
        const sourceBranch = getSourceBranch(jobResponse);

        let targetBranch;
        try {
            targetBranch = getTargetBranch(sourceBranch, projectBackMergeConfig.branches);
        } catch (err) {
            return Promise.reject(err);
        }

        return backMerge(jobResponse.pipeline.project_id, sourceBranch, targetBranch, projectBackMergeConfig.autoMergeEnabled || false);
    }).then(() => {
        return res.status(200).send({ message: 'OK' });
    }).catch(err => {
        return res.status(err?.status || 500).json({ message: err?.message || 'ERROR' });
    });
})

const backMerge = (projectId, sourceBranch, targetBranch, autoMergeEnabled) => {
    // create mr
    const backMergePromise = fetch(`${config.apiUrl}/projects/${projectId}/merge_requests`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + config.apiToken
        },
        body: JSON.stringify({
            'title': `Back-merge ${sourceBranch} into ${targetBranch}`,
            'source_branch': sourceBranch,
            'target_branch': targetBranch,
        }),
    }).then((response) => {
        if (!response.ok) {
            return Promise.reject();
        }

        return response.json();
    })

    if (autoMergeEnabled) {
        backMergePromise.then(response => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    return resolve(response);
                }, 1000);
            });
        }).then((response) => {
            const mrIid = response.iid;
            return fetch(`${config.apiUrl}/projects/${projectId}/merge_requests/${mrIid}/merge`, {
                method: 'PUT',
                body: JSON.stringify({'merge_when_pipeline_succeeds': true}),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + config.apiToken
                }
            })
        })
    }

    return backMergePromise;
};

const getSourceBranch = (jobResponse) => {
    return jobResponse.pipeline.ref;
};

const getTargetBranch = (sourceBranch, backMergeBranches) => {
    if (!backMergeBranches[sourceBranch]) {
        throw Error('Source branch has no back-merge branch configured');
    }

    return backMergeBranches[sourceBranch];
};

const getProjectBackMergeConfig = async (projectId) => {
    return fetch(config.apiUrl + `/projects/${projectId}/variables`, {
        headers: {
            'PRIVATE-TOKEN': config.apiToken,
        }
    }).then((response) => {
        if (!response.ok) {
            return Promise.reject();
        }

        return response.json();
    }).then((variablesResponse) => {
        let variable = variablesResponse.find(variable => {
            return variable.key === config.backMergeConfigKey;
        });

        if (!variable || !variable.value) {
            return Promise.reject('No config');
        }

        return JSON.parse(variable.value);
    });
};

app.listen(port, () => {
    console.log(`back-merge-request API listening on port ${port}`)
})

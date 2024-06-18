Possible env variables:

- API_URL
  - i.e https://gitlab.com/api/v4
- API_TOKEN
  - Gitlab personal access token
- API_MERGE_DELAY_IN_MILLISECONDS
  - Delay to wait before triggering the update to set auto merge on the created merge request
  - Default: `1000`
- BACK_MERGE_CONFIG_KEY
  - CI/CD Variable name for the project
  - JSON object containing 2 possible keys
    - autoMergeEnabled `bool` (default: `false`)
    - branches `object<sourceBranch, targetBranch>`

```json
{
  "autoMergeEnabled": true,
  "branches": {
    "main": "acceptance"
  }
}
```

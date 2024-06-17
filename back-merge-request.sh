#!/bin/sh

set -e

if [ ! -z "$BMR_DEBUG" ]; then
  set -x
fi

if [ -z "$BMR_MERGE_DELAY" ]; then
  BMR_MERGE_DELAY=1
fi

if [ -z "$CI_JOB_TOKEN" ]; then
  echo "Missing CI_JOB_TOKEN"
  exit 1
fi

if [ -z "$BMR_PROJECT_ID" ]; then
  echo "Missing BMR_PROJECT_ID"
  exit 2
fi

if [ -z "$BMR_SOURCE_BRANCH" ]; then
  echo "Missing BMR_SOURCE_BRANCH"
  exit 3
fi

if [ -z "$BMR_TARGET_BRANCH" ]; then
  echo "Missing BMR_TARGET_BRANCH"
  exit 4
fi

MR_CREATE_RESPONSE=$(curl -s -XPOST https://git.wdvlp.nl/api/v4/projects/"$BMR_PROJECT_ID"/merge_requests -H "Authorization: Bearer $CI_JOB_TOKEN" -H 'Content-Type: application/json' -d '{"source_branch": "'"$BMR_SOURCE_BRANCH"'", "target_branch": "'"$BMR_TARGET_BRANCH"'", "title": "Back-merge '"$BMR_SOURCE_BRANCH"' into '"$BMR_TARGET_BRANCH"'"}')

if [ ! -z "$BMR_DEBUG" ]; then
  echo "$MR_CREATE_RESPONSE" | jq
fi

MR_IID=$(echo "$MR_CREATE_RESPONSE" | jq -r '.iid')

# Necessary, otherwise we get a 405 Method Not Allowed
sleep $BMR_MERGE_DELAY

if [ "$BMR_AUTO_MERGE" = "1" ]; then
  MR_MERGE_RESPONSE=$(curl -s -XPUT https://git.wdvlp.nl/api/v4/projects/"$BMR_PROJECT_ID"/merge_requests/"$MR_IID"/merge -H "Authorization: Bearer $CI_JOB_TOKEN" -H 'Content-Type: application/json' -d '{"merge_when_pipeline_succeeds": true}')

  if [ ! -z "$BMR_DEBUG" ]; then
    echo "$MR_MERGE_RESPONSE" | jq
  fi
fi

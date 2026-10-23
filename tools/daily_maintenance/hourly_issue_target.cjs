'use strict';
// Fail closed instead of creating a new ledger when GitHub issue listing is incomplete.
// The canonical ledger was established in Issue #69; duplicates are never sources of truth.
const ISSUE_NUMBER = 69;
const ISSUE_TITLE = '[Hourly QA] Deep Focus agent coordination';

async function resolveHourlyIssue(github, {owner, repo}) {
  if (typeof github?.rest?.issues?.get !== 'function') {
    throw Error('GitHub issues.get unavailable');
  }
  const {data} = await github.rest.issues.get({owner, repo, issue_number: ISSUE_NUMBER});
  if (!data || data.number !== ISSUE_NUMBER || data.title !== ISSUE_TITLE ||
      data.state !== 'open' || data.pull_request) {
    throw Error('Invalid canonical Hourly QA issue; refusing to create or overwrite a different issue');
  }
  return data;
}

module.exports = {ISSUE_NUMBER, ISSUE_TITLE, resolveHourlyIssue};

const fetchTransactions = require("./eb/fetchTransactions");
const importTransactions = require("./actual/importTransactions");
const notify = require("./notify");
const { loadState, putState } = require("./state");
const checkSession = require("./checkSession");

async function sync() {
  console.log(`Starting sync at ${new Date().toLocaleString()}…`);

  if (!checkSession()) {
    return;
  }

  const { source, sync } = loadState();

  const results = await Promise.all(
    source.accountUIDs?.map(async (accountUID) => {
      const syncState = sync?.[accountUID] ?? {};
      try {
        console.log(`Fetching transactions for account ${accountUID}…`);
        const { state, transactions } = await fetchTransactions(
          accountUID,
          syncState,
        );
        return { accountUID, state, transactions };
      } catch (err) {
        notify(`Syncing account ${accountUID} failed: ${err.message ?? err}`);
        return { accountUID, state: syncState, transactions: [] };
      }
    }) ?? [],
  );

  const transactions = results.flatMap((result) => result.transactions);
  if (!transactions.length) {
    console.log("No new transactions found to be imported");
  } else {
    console.log(
      `Importing ${transactions.length} transactions to Actual Budget…`,
    );
    await importTransactions(transactions);
  }

  putState({
    sync: Object.fromEntries(
      results.map((result) => [result.accountUID, result.state]),
    ),
  });

  console.log(`Done syncing ${source.accountUIDs?.length ?? 0} accounts`);
}

module.exports = sync;

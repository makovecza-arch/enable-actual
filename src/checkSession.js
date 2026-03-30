const { PUBLIC_URL, SESSION_EXPIRY_WARNING } = require("./config");
const notify = require("./notify");
const { loadState } = require("./state");

function checkSession() {
  const { source } = loadState();

  if (!source) {
    notify(
      "There is no account session configured yet. Please authenticate.",
      new URL("auth", PUBLIC_URL).href,
    );

    return false;
  }

  if (source.expiry && SESSION_EXPIRY_WARNING > 0) {
    const now = Date.now();
    const expiry = new Date(source.expiry);
    const warning = expiry.getTime() - SESSION_EXPIRY_WARNING;
    if (now >= warning) {
      const remainingDays = Math.floor(
        Math.max(0, expiry.getTime() - now) / (24 * 60 * 60 * 1000),
      );

      notify(
        `Your account session expires in ${remainingDays} days. Please don't forget to reauthenticate in time.`,
        new URL("auth", PUBLIC_URL).href,
      );
    }
  }

  return true;
}

module.exports = checkSession;

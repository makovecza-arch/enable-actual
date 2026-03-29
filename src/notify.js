const { default: fetch } = require("node-fetch");
const {
  NTFY_URL,
  NTFY_USERNAME,
  NTFY_PASSWORD,
  APP_NAME,
} = require("./config");

function notify(message, url) {
  console.log(`\n\n! ${message}${url ? ` - ${url}` : ""}\n\n`);

  if (NTFY_URL) {
    const headers = new Headers({ Title: APP_NAME });

    if (NTFY_USERNAME && NTFY_PASSWORD) {
      headers.set(
        "Authorization",
        `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      );
    }

    if (url) headers.set("Click", url);

    fetch(NTFY_URL, {
      method: "POST",
      headers,
      body: message,
    });
  }
}

module.exports = notify;

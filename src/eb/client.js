const jwt = require("jsonwebtoken");
const fetch = require("node-fetch").default;

class EBClient {
  constructor({ api, appID, privateKey }) {
    this.api = api.replace(/\/*$/g, "");
    this.appID = appID;
    this.privateKey = privateKey;
  }

  createJWT() {
    const now = Math.floor(Date.now() / 1000);

    return jwt.sign(
      {
        iss: "enablebanking.com",
        aud: "api.enablebanking.com",
        iat: now,
        exp: now + 3600,
      },
      this.privateKey,
      { algorithm: "RS256", header: { kid: this.appID } },
    );
  }

  async initAuth({
    state,
    tokenValidity,
    bankName,
    bankCountry,
    psuType,
    redirectURL,
  }) {
    const jwt = this.createJWT();
    const validUntil = new Date(Date.now() + tokenValidity).toISOString();

    const res = await fetch(`${this.api}/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        access: { valid_until: validUntil },
        aspsp: { name: bankName, country: bankCountry },
        state,
        redirect_url: redirectURL,
        psu_type: psuType,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Auth request failed: ${res.status} ${res.statusText}\n${await res.text()}`,
      );
    }

    const { url } = await res.json();
    return { state, validUntil, url };
  }

  async getSession({ code }) {
    const jwt = this.createJWT();

    const res = await fetch(`${this.api}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      throw new Error(
        `Session request failed: ${res.status} ${res.statusText}\n${await res.text()}`,
      );
    }

    const { session_id: sessionID, accounts } = await res.json();
    return { sessionID, accounts: accounts ?? [] };
  }

  async getTransactions({
    uid,
    dateFrom,
    dateTo,
    transactionStatus,
    continuationKey,
  }) {
    const jwt = this.createJWT();

    const search = new URLSearchParams();
    if (dateFrom) search.set("date_from", dateFrom);
    if (dateTo) search.set("date_to", dateTo);
    if (transactionStatus) search.set("transaction_status", transactionStatus);
    if (continuationKey) search.set("continuation_key", continuationKey);
    const res = await fetch(
      `${this.api}/accounts/${encodeURIComponent(uid)}/transactions?${search.toString()}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      },
    );

    if (!res.ok) {
      throw new Error(
        `Transaction request failed: ${res.status} ${res.statusText}\n${await res.text()}`,
      );
    }

    const { transactions, continuation_key: nextContinuationKey } =
      await res.json();

    return {
      transactions,
      continuationKey: nextContinuationKey,
      next: nextContinuationKey
        ? async () => {
            return this.getTransactions({
              uid,
              continuationKey: nextContinuationKey,
            });
          }
        : undefined,
    };
  }
}

module.exports = EBClient;

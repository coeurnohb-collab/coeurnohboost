cconst crypto = require("crypto");

exports.handler = async (event) => {
  const signature = event.headers["mbotepay-signature"];
  const secret = "whsec_TON_SECRET_ICI";

  const expected = crypto
    .createHmac("sha256", secret)
    .update(event.body)
    .digest("hex");

  if (signature !== expected) {
    return { statusCode: 400, body: "Signature invalide" };
  }

  const payload = JSON.parse(event.body);
  console.log("Paiement confirmé:", payload);

  return { statusCode: 200, body: "Webhook reçu" };
};Enter

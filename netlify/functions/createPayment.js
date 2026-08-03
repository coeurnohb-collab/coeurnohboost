cconst fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const response = await fetch("https://api.mbotepay.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": "Bearer mp_live_TA_CLE_API_ICI",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: body.amount,
        currency: "USD",
        description: "Paiement Coeurnoh Boost",
        callback_url: "https://coeurnohboost.netlify.app/.netlify/functions/webhook"
      })
    });

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};Enter

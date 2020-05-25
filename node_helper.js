"use strict";

const NodeHelper = require("node_helper");
const tibber = require("./tibber");
const ferroamp = require("./ferroamp");

module.exports = NodeHelper.create({
  start: function() {
    console.log(this.name + ": Starting node helper");
    this.loaded = false;
  },

  log: function(arg1, arg2 = "") {
    if (this.config.logging) {
      console.log(this.name + ": " + arg1 + arg2);
    }
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === "TIBBER_CONFIG") {
      if (this.loaded) {
        if (payload.tibberToken != this.config.tibberToken) {
          console.error(
            this.name +
              ": Two or more different tibberTokens detected. That is not supported."
          );
        }
        if (payload.houseNumber != this.config.houseNumber) {
          console.error(
            this.name + ": Two or more houseNumbers detected is not supported."
          );
        }
      } else {
        console.log(this.name + ": Configuring");
        var config = payload;
        this.config = config;
        this.loaded = true;
        const self = this;

        const sub = this.receiveTibberSubscriptionData.bind(this);
        tibber.subscribe(config.tibberToken, config.houseNumber, sub);

        this.readTibberData(config);
        setInterval(function() {
          self.readTibberData(config);
        }, 1000 * 60 * 5); // Every 5 minutes

        ferroamp.connect(config.ferroampIp, config.ferroampPort, config.ferroampToken)
      }
    }
  },

  readTibberData: function(config) {
    let tibberData = {
      consumption: [],
      prices: {
        current: null,
        twoDays: []
      }
    };
    tibber
      .getTibber(config.tibberToken, config.houseNumber, config.historyHours)
      .then(res => {
        this.log("Tibber data: ");
        this.log(JSON.stringify(res, null, 2));
        tibberData.prices.current = res.currentSubscription.priceInfo.current;
        tibberData.prices.twoDays = res.currentSubscription.priceInfo.today.concat(
          res.currentSubscription.priceInfo.tomorrow
        );
        if (res.consumption) {
          tibberData.consumption = res.consumption.nodes.filter(n => {
            return n.consumption != null;
          });
        }
        this.sendSocketNotification("TIBBER_DATA", tibberData);
      })
      .catch(e => {
        console.error(this.name + ": Error getting tibber prices: ", e);
      });
  },

  receiveTibberSubscriptionData: function(data) {
    const subData = JSON.parse(data);
    if (subData.type == "data") {
      this.sendSocketNotification(
        "TIBBER_SUBSCRIPTION_DATA",
        subData.payload.data.liveMeasurement
      );
      this.log(
        "Tibber subscription data:",
        JSON.stringify(subData.payload.data.liveMeasurement, null, 2)
      );
    }
  },

  stop: function() {
    tibber.close();
    ferroamp.close();
  }
});

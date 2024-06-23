const express = require("express");
const {
  runSimulationOfHumidity,
  getTheDataOfUrbanAndRuralWeather,
  monthlyRainfallPrediction
} = require("./controller");

const router = express.Router();

router.post("/humidity-calculation", runSimulationOfHumidity);
router.post("/monthly-rainfall-prediction", monthlyRainfallPrediction);
router.post("/weather-comparison", getTheDataOfUrbanAndRuralWeather);

module.exports = router;

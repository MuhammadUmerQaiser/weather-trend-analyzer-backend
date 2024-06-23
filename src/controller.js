const axios = require("axios");
const fs = require("fs"); // for file operations
const path = require("path");

const API_KEY = "4f5c6e3cbc5348568d0150015242206"; // Replace with your WeatherAPI key
const BASE_URL = "http://api.weatherapi.com/v1/current.json";

const getTheWeatherDataFromApi = async (city) => {
  const response = await axios.get(`${BASE_URL}?key=${API_KEY}&q=${city}`);
  return response;
};

const getRandomNormal = (mean, stddev) => {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stddev;
  // return (
  //   mean + stddev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  // );
};

exports.runSimulationOfHumidity = async (req, res) => {
  const city = req.body.city;
  const days = parseInt(req.body.days, 10);
  const iterations = 1000; // Number of iterations for Monte Carlo simulation

  try {
    const response = await getTheWeatherDataFromApi(city);
    const {
      temp_c: temperature,
      humidity,
      precip_mm: rainfall,
      feelslike_c,
    } = response.data.current;

    // Monte Carlo Simulation Logic
    const results = [];
    for (let i = 0; i < days; i++) {
      let tempSum = 0;
      let humiditySum = 0;
      let rainfallSum = 0;
      let feelsLikeSum = 0;

      for (let j = 0; j < iterations; j++) {
        const simulatedTemp = getRandomNormal(temperature, 5);
        const simulatedHumidity = getRandomNormal(humidity, 10);
        const simulatedRainfall = getRandomNormal(rainfall, 10);
        const simulatedFeelsLike = getRandomNormal(feelslike_c, 10);
        tempSum += simulatedTemp;
        humiditySum += simulatedHumidity;
        rainfallSum += simulatedRainfall;
        feelsLikeSum += simulatedFeelsLike;
      }

      const avgTemp = Math.round(tempSum / iterations);
      const avgHumidity = Math.round(humiditySum / iterations);
      const avgRainfall = Math.round(rainfallSum / iterations);
      const avgFeelsLike = Math.round(feelsLikeSum / iterations);

      const randomAvgTemp = getRandomNormal(avgTemp, 5);
      const randomAvgHumidity = getRandomNormal(avgHumidity, 10);
      const randomAvgRainfall = getRandomNormal(avgRainfall, 10);
      const randomAvgFeelsLike = getRandomNormal(avgFeelsLike, 10);

      results.push({
        day: i + 1,
        temp: randomAvgTemp,
        humidity: randomAvgHumidity,
        rainfall: randomAvgRainfall,
        feels_like: randomAvgFeelsLike,
      });
    }

    res.json({
      data: results,
      current: response.data.current,
    });
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).send("Error fetching weather data");
  }
};

exports.getTheDataOfUrbanAndRuralWeather = async (req, res) => {
  const { rural, urban } = req.body;
  const iterations = 1000; // Number of iterations for Monte Carlo simulation

  try {
    const urbanResponse = await getTheWeatherDataFromApi(urban);
    const ruralResponse = await getTheWeatherDataFromApi(rural);

    const urbanWeather = urbanResponse.data.current;
    const ruralWeather = ruralResponse.data.current;

    // Parameters to compare
    const parameters = [
      "temp_c",
      "humidity",
      "wind_kph",
      "precip_mm",
      "feelslike_c",
      "pressure_in",
    ];

    const simulateWeather = (weatherData, stddev) => {
      const simulationResults = {};

      parameters.forEach((param) => {
        let sum = 0;
        for (let i = 0; i < iterations; i++) {
          sum += getRandomNormal(weatherData[param], stddev);
        }
        const avg = sum / iterations;
        simulationResults[param] = getRandomNormal(avg, stddev); // Averaging the results for prediction
      });

      return simulationResults;
    };

    // Simulate urban and rural weather for the next day
    const urbanSimulated = simulateWeather(urbanWeather, 5); // Adjust stddev as needed
    const ruralSimulated = simulateWeather(ruralWeather, 5); // Adjust stddev as needed

    res.json({
      urban: urbanSimulated,
      rural: ruralSimulated,
      current: {
        urban: urbanWeather,
        rural: ruralWeather,
      },
    });
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).send("Error fetching weather data");
  }
};

exports.monthlyRainfallPrediction = async (req, res) => {
  const city = req.body.city;
  const daysInMonth = 30;
  const iterations = 1000; // Number of iterations for Monte Carlo simulation

  try {
    const response = await getTheWeatherDataFromApi(city);
    const { precip_mm: currentRainfall } = response.data.current;

    const historicalData = readHistoricalData();

    const monthlyStats = calculateMonthlyStats(historicalData);

    const results = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const month = "June";

      if (monthlyStats[month]) {
        const { mean, stdDev } = monthlyStats[month];
        const simulatedRainfall = simulateRainfall(mean, stdDev, iterations);
        const avgRainfall =
          simulatedRainfall.reduce((a, b) => a + b, 0) / iterations;

        const randomAvgRainfall = getRandomNormal(avgRainfall, stdDev);

        results.push({
          day,
          rainfall: randomAvgRainfall,
        });
      } else {
        console.warn(
          `No historical data found for ${month}. Skipping prediction.`
        );
      }
    }

    const apiResults = [];
    for (let i = 0; i < daysInMonth; i++) {
      let rainfallSum = 0;

      for (let j = 0; j < iterations; j++) {
        const simulatedRainfall = getRandomNormal(currentRainfall, 10);
        rainfallSum += simulatedRainfall;
      }

      const avgRainfall = Math.round(rainfallSum / iterations);

      const randomAvgRainfall = getRandomNormal(avgRainfall, 10);

      apiResults.push({
        day: i + 1,
        rainfall: randomAvgRainfall,
      });
    }

    res.json({
      datasetData: results,
      data: apiResults,
      current: response.data.current,
      history: historicalData,
    });
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).send("Error fetching weather data");
  }
};

const readHistoricalData = () => {
  const filePath = path.join(__dirname, "rainfall_dataset.json");
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading historical data file:", err);
    return [];
  }
};


// Function to calculate mean and standard deviation of rainfall for each month
const calculateMonthlyStats = (historicalData) => {
  const monthlyStats = {};

  // Iterate through historical data to calculate mean and standard deviation for each month
  historicalData.forEach((entry) => {
    const { Year, Month, "Rainfall - (MM)": rainfall } = entry;
    if (!monthlyStats[Month]) {
      monthlyStats[Month] = {
        count: 0,
        sum: 0,
        sumOfSquares: 0,
      };
    }
    monthlyStats[Month].count++;
    monthlyStats[Month].sum += rainfall;
    monthlyStats[Month].sumOfSquares += rainfall * rainfall;
  });

  // Calculate mean and standard deviation for each month
  Object.keys(monthlyStats).forEach((month) => {
    const { count, sum, sumOfSquares } = monthlyStats[month];
    const mean = sum / count;
    const variance = (sumOfSquares - (sum * sum) / count) / count;
    const stdDev = Math.sqrt(variance);
    monthlyStats[month] = { mean, stdDev };
  });

  return monthlyStats;
};

// Function to simulate rainfall using Monte Carlo simulation
const simulateRainfall = (mean, stdDev, iterations) => {
  const results = [];
  for (let i = 0; i < iterations; i++) {
    const simulatedRainfall = getRandomNormal(mean, stdDev);
    results.push(simulatedRainfall);
  }
  return results;
};

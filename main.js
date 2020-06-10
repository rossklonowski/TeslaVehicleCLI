///********************************************************************************************
///
///     This program creates an Initial State Dashboard focused on displaying information
///     related to a Tesla vehicle.
///
///     APIs Used: 
///         Dark Sky
///         IEX Cloud
///         Initial State
///         Mapuest
///         Philips Hue
///         Tesla Unofficial
///
///     Written By Ross Klonowski
///     
/// 
///********************************************************************************************

var https = require("https");
var IS = require('initial-state');
const request = require("request");
require('dotenv').config({path: __dirname + '/.env'})
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

// Program Options
var program = {
    debug: true, // Will show errors and responses from APIs
    enable_lights: false, 
    show_uploaded: false,
    show_api_responses: false,
    polling_delay: process.env['POLLING_DELAY'], // delay between updates in seconds
}

// Dark Sky
var darkSky = {
    key: process.env['DARK_SKY_KEY'],
    lat: process.env['HOME_LAT'],
    lon: process.env['HOME_LON'],
}
// Philips Hue
var bridge = {
    IPaddress: process.env['PHILIPS_HUE_IP_ADDRESS'],
    username: process.env['PHILIPS_HUE_USERNAME'],
}
// Tesla
var tesla = {
    current_access_token: process.env['TESLA_CURRENT_ACCESS_TOKEN'],
    access_token: process.env['TESLA_ACCESS_TOKEN'], // Expires every 45 days
    vehicle_id: process.env['TESLA_VEHICLE_ID'],
}
// Initial State
var myBucket = {
    BUCKET_KEY: process.env['INITIAL_STATE_BUCKET_KEY'],
    ACCESS_KEY: process.env['INITIAL_STATE_ACCESS_KEY'], // Never Expires
};
// IEX Cloud
var IEX_CLOUD = {
    token: process.env['IEX_CLOUD_TOKEN'],  // Never Expires
}
// Mapquest
var mapquest = {
    key: process.env['MAPUEST_KEY'], // Never Expires
}

var home = { 
    lat: process.env['HOME_LAT'],
    lon: process.env['HOME_LON'],
}

var bucket = IS.bucket(myBucket.BUCKET_KEY, myBucket.ACCESS_KEY);

var signal = {
///
///     Tesla API
///
    battery_heater_on: 'Battery Heater',
    battery_level: 'Battery Level',
    battery_range: 'Battery Range',
    car_version: 'Car Version',
    charge_energy_added: 'Charge Energy Added',
    charger_voltage: 'Charger Voltage',
    charger_actual_current : 'Charger Actual Current',
    charge_rate: 'Charge Rate',
    charge_rate_units: 'Charge Rate Units',
    // charger_power: 0,
    est_battery_range: "Estimated Range",
    est_battery_range_units: "Estimated Range Units",
    ideal_battery_range: "Ideal range",
    ideal_battery_range_units: "Ideal range Units",
    locked: 'Locked',
    usable_battery_level: "Usable Battery Level",
    usable_battery_level_units: "Usable Battery Level Units",
    interior_temp: 'Interior Temperature',
    exterior_temp: 'Exterior Temperature',
    minutes_to_full_charge: 'Minutes To Full Charge',
    native_latitude: 'Latitude',
    native_longitude: 'Longitude',
    odometer: 'Odometer',
    power: 'Drive Power',
    sentry_mode : 'Sentry Mode',
    vehicle_name : 'Vehicle Name',
///
///     Dark Sky API 
///
    outside_temperature: 'Temperature', //outdoor temp
    sunrise: 'Sunrise',
    sunset: 'Sunset',
///
/// IEX Cloud API (Stocks)
///
    last_sale_price: 'Last Sale Price',
///
/// Mapquest
/// 
    location_reverse_geocoded: 'Location Reverse Geocoded',
///
///     Custom Tiles
///
    time_since_last_refresh: 'Last Refresh',
    update_count: 'Update Count',
    range_loss_units: 'Range Loss Units',
    charger_power_exact: 'Charger Power Exact',
    chraging_session_cost: 'Charging Session Cost',
    charger_power_exact_noformat: 'Charger Power Exact No Format',
    status: 'Status',
};

var base_url = {
    darkSky: 'https://api.darksky.net/forecast',
    iex_cloud: 'https://cloud.iexapis.com/stable/stock',
    mapquest: 'http://open.mapquestapi.com',
    tesla: 'owner-api.teslamotors.com',
}

var path = {
    ///
    ///     Dark Sky
    ///
    forecast : darkSky.key + '/' + darkSky.lat + ',' + darkSky.lon,
    ///
    ///     Mapquest
    ///
    reverse_geocode : '/geocoding/v1/reverse',
    ///
    ///     Philips Hue
    ///
    all_lights : '/lights',
    light : '/lights/9/state',
    ///
    ///     Tesla
    ///
    wake_up : '/api/1/vehicles/' + tesla.vehicle_id + '/wake_up',
    authentication : '/oauth/token',
    vehicles : '/api/1/vehicles',
    data : '/api/1/vehicles/' + tesla.vehicle_id + '/vehicle_data',
    charge_state : '/api/1/vehicles/' + tesla.vehicle_id + '/data_request/charge_state',
    climate_state : '/api/1/vehicles/' + tesla.vehicle_id + '/data_request/climate_state',
    drive_state : '/api/1/vehicles/' + tesla.vehicle_id + '/data_request/drive_state',
    gui_settings : '/api/1/vehicles/' + tesla.vehicle_id + '/data_request/gui_settings',
    vehicle_state : '/api/1/vehicles/' + tesla.vehicle_id + '/data_request/vehicle_state',
    vehicle_config : '/api/1/vehicles/' + tesla.vehicle_id + '/data_request/vehicle_config',
    mobile_enabled : '/api/1/vehicles/' + tesla.vehicle_id + '/mobile_enabled',

};

class Light {
    
    constructor(number) {
        this.number = number;
    }

    turnOff() {

        var offBody = JSON.stringify({"on" : false})
        var offOptions = { 
                        method: 'PUT',
                        body: offBody, 
                        url: 'http://' + bridge.IPaddress + '/api/' + bridge.username + '/lights/' + this.number + '/state',
                        headers: { 
                                Host: bridge.IPaddress,
                                Connection: 'keep-alive',
                                'Content-Length': offBody.length,
                                'Content-Type': 'application/json' 
                                },
                    };

        var options = offOptions;
        var body = offBody;

        request(options, function (error, response, body) {
            
            if (error) {
                throw new Error(error);
            }

            if (program.show_api_responses) { 
                console.log(JSON.parse(body)); 
            }
        })
    }
    
    turnOn() {

        var onBody = JSON.stringify({"on":true})
        var options = { 
                        method: 'PUT',
                        body: onBody, 
                        url: 'http://' + bridge.IPaddress + '/api/' + bridge.username + '/lights/' + this.number + '/state',
                        headers: { 
                                Host: bridge.IPaddress,
                                Connection: 'keep-alive',
                                'Content-Length': onBody.length,
                                'Content-Type': 'application/json' 
                                },
                    };

        request(options, function (error, response, body) {
            if (error) {
                throw new Error(error);
            }
    
            if (program.debug) { 
                console.log(JSON.parse(body)); 
            }
        })
    }

    turnGreen() {
        
        var onBody = JSON.stringify({"on":true, "sat":254, "bri":254,"hue":30000}) // 30000 is green
        var options = { 
                        method: 'PUT',
                        body: onBody, 
                        url: 'http://' + bridge.IPaddress + '/api/' + bridge.username + '/lights/' + this.number + '/state',
                        headers: { 
                                Host: bridge.IPaddress,
                                Connection: 'keep-alive',
                                'Content-Length': onBody.length,
                                'Content-Type': 'application/json' 
                                },
                    };

        request(options, function (error, response, body) {
            if (error) {
                throw new Error(error);
            }

            body = JSON.parse(body);

            if (Object.keys(body[0]) == 'success')
            {
                if (program.debug)
                {
                    console.log('Success!')
                    console.log(body);
                }
            }
            else
            {
                console.log("Error - could not turn on light");

                if (program.debug)
                {
                    console.log(body);
                }
                
            }
        })
    }
}

function pushValue(tile, value, time) {

    if (time == undefined) {
        bucket.push(tile, value); //bucket.push(key, value)
    }
    else {
        bucket.push(tile, value, time); //bucket.push(key, value[, date])
    }

    if (program.show_uploaded) {
        console.log('Uploaded: ', tile, value);
    }

    //update_timestamp(time); -- Dont do it everytime

};

function pushLocation(latTile, longTile, Latitude, Longitude, time) {

    pushValue(latTile, Latitude, time);
    pushValue(longTile, Longitude, time);
}

function time_since_epoch() {

    var d = new Date();

    var time = {
        seconds : Math.round(d.getTime() / 1000),
        milliseconds : d.getTime() / 1000,
    }

    return time;
};

function CtoF(cVal) {
    return ( ((cVal * 9/5) + 32).toPrecision(4) );
};

function authenticate() {

    function process_authentication(my_obj){ 

        my_obj = JSON.parse(my_obj); 
        
        if (1) {
            console.log("access_token: " + my_obj.access_token);
            console.log("token_type: " + my_obj.token_type);
            console.log("expires_in: " + my_obj.expires_in);
            console.log("refresh_token: " + my_obj.expires_in);
            console.log("created_at: " + my_obj.created_at);
        }
        return my_obj.access_token;
    };

    var options = {
                    'method': 'POST',
                    'url': 'https://owner-api.teslamotors.com/oauth/token',
                    'headers': {
                    'Content-Type': 'text/plain',
                    'User-Agent': '007'
                    },
                    formData: {
                        'grant_type': 'password',
                        'client_id': process.env['TESLA_CURRENT_CLIENT_ID'],
                        'client_secret': process.env['TESLA_CURRENT_CLIENT_SECRET'],
                        'email': process.env['CAR_EMAIL'],
                        'password': process.env['CAR_PASSWORD']
                    }
      };
      request(options, function (error, response) { 
        if (error) throw new Error(error);
            process_authentication(response.body);
      });
}

function get_vehicle_id() {
    
    function process_data_response(this_obj){
        
        this_obj = JSON.parse(this_obj);
        
        this_obj = this_obj.response;

        if (program.show_api_responses) {
            console.log("id: " + this_obj[0].id_s) // We use id_s since vehicle_id is too large for JSON
        }
        return (this_obj[0].id_s)
    };
        
        var options = { 
                        method: 'GET',
                        url: 'https://owner-api.teslamotors.com/api/1/vehicles',
                        headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + tesla.access_token,
                                'User-Agent': '007',
                                 }
                      };
        
        request(options, function (error, response, body, status) {
            if (error) {
                console.log(error)
                throw new Error(error);
            }
            tesla.vehicle_id = process_data_response(body); //vehicle_id is actually the id_s in the response
            
            function onErr(err) {
                console.log(err);
                return 1;
            }
        });
};

function get_state() {
    
    function process_state_response(this_obj){

        if (!this_obj.includes('<!DOCTYPE')) { // If response is '<!DOCTYPE html>', servers are having problems.

            if (this_obj != '') {
            
                this_obj = JSON.parse(this_obj);
                
                if (this_obj.response != undefined) // If response is undefined, car is sleeping
                {
                    
                    if (program.show_api_responses) {
                        console.log('Tesla data response:');
                        console.log(this_obj);
                    }
                    // Get timestamp
                    let teslaTimestamp = this_obj.response.charge_state.timestamp;

                    let battery_level = this_obj.response.charge_state.battery_level + ' %';
                    let car_version = this_obj.response.vehicle_state.car_version;
                    // Charge Energy
                    let charge_energy_added = this_obj.response.charge_state.charge_energy_added;
                    let charge_energy_added_units = this_obj.response.charge_state.charge_energy_added + ' kWh';
                    // Power, Current, Voltage
                    let charger_actual_current = this_obj.response.charge_state.charger_actual_current;
                    let charger_voltage = this_obj.response.charge_state.charger_voltage;
                    let charger_exact_power = ((charger_actual_current * charger_voltage) / 1000) + ' kW';
                    let charger_exact_power_noformat = charger_actual_current * charger_voltage + ' W';
                    
                    let minutes_to_full_charge = this_obj.response.charge_state.minutes_to_full_charge + ' minutes';
                    
                    if (this_obj.response.charge_state.minutes_to_full_charge == 0) {
                        minutes_to_full_charge = 'Not Charging';
                    }
                    // Lock State
                    let locked = this_obj.response.vehicle_state.locked;
                    
                    if (locked) {
                        locked = ':lock:';
                    }
                    else
                    {
                        locked = ':unlock:';
                    }

                    let usable_battery_level = this_obj.response.charge_state.usable_battery_level;
                    let usable_battery_level_units = this_obj.response.charge_state.usable_battery_level + ' %';
                    let est_battery_range = this_obj.response.charge_state.est_battery_range;
                    let est_battery_range_units = this_obj.response.charge_state.est_battery_range + ' mi';
                    let ideal_battery_range = this_obj.response.charge_state.ideal_battery_range;
                    let ideal_battery_range_units = this_obj.response.charge_state.ideal_battery_range + ' mi';
                    let interior_temp = CtoF(this_obj.response.climate_state.inside_temp) + ' °F';
                    let exterior_temp = CtoF(this_obj.response.climate_state.outside_temp) + ' °F';
                    let odometer = this_obj.response.vehicle_state.odometer.toFixed(2) + ' mi';
                    let power = this_obj.response.drive_state.power + ' kW';
                    
                    let sentry_mode = this_obj.response.vehicle_state.sentry_mode;
                    
                    if (sentry_mode) {
                        sentry_mode = ':lock:';
                    }
                    else
                    {
                        sentry_mode = ':unlock:';
                    }
                    
                    let charge_rate_units = this_obj.response.charge_state.charge_rate + ' A';
                    
                    //let vehicle_name = ':red_car:: ' + this_obj.response.vehicle_state.vehicle_name; // Linux doesnt support car
                    let vehicle_name = this_obj.response.vehicle_state.vehicle_name

                    pushValue(signal.battery_level, battery_level, teslaTimestamp);
                    pushValue(signal.car_version, car_version, teslaTimestamp);
                    pushValue(signal.charge_rate_units, charge_rate_units, teslaTimestamp);
                    pushValue(signal.locked, locked, teslaTimestamp);
                    pushValue(signal.minutes_to_full_charge, minutes_to_full_charge, teslaTimestamp);
                    pushValue(signal.usable_battery_level_units, usable_battery_level_units, teslaTimestamp);
                    pushValue(signal.charge_energy_added, charge_energy_added_units, teslaTimestamp);
                    pushValue(signal.est_battery_range, est_battery_range, teslaTimestamp);
                    pushValue(signal.est_battery_range_units, est_battery_range_units, teslaTimestamp);
                    pushValue(signal.ideal_battery_range_units, ideal_battery_range_units, teslaTimestamp);
                    pushValue(signal.interior_temp, interior_temp, teslaTimestamp);
                    pushValue(signal.exterior_temp, exterior_temp, teslaTimestamp);
                    pushValue(signal.odometer, odometer, teslaTimestamp);
                    pushValue(signal.power, power, teslaTimestamp);
                    pushValue(signal.sentry_mode, sentry_mode, teslaTimestamp);
                    pushValue(signal.vehicle_name, vehicle_name, teslaTimestamp);
                    pushValue(signal.charger_power_exact, charger_exact_power, teslaTimestamp);
                    pushValue(signal.charger_power_exact_noformat, charger_exact_power_noformat, teslaTimestamp);
                    pushValue(signal.charger_actual_current, charger_actual_current + ' A', teslaTimestamp);
                    pushValue(signal.charger_voltage, charger_voltage + ' V', teslaTimestamp);

                    pushValue(signal.chraging_session_cost, '$' + (charge_energy_added * .135).toFixed(2));

                    pushValue(signal.range_loss_units, get_range_loss(usable_battery_level, ideal_battery_range), teslaTimestamp)

                    if (program.enable_lights) {
                        if (this_obj.response.charge_state.charge_rate > 0) {
                            var light9 = new Light(9);
                            light9.turnGreen();
                        }
                        else
                        {
                            var light9 = new Light(9);
                            light9.turnOff()
                        }
                    }
                    
                    let carLatitude = this_obj.response.drive_state.native_latitude;
                    let carLongitude = this_obj.response.drive_state.native_longitude;

                    reverse_geocode(carLatitude, carLongitude);
                    
                    var date = new Date();
                    var hour = date.getHours();

                    console.log('hour: ' + hour);
                    
                    if ((hour < 6) || (hour > 21)) { // Dont upload if in hours [12AM, 6AM] and [10PM, 12AM]
                        reverse_geocode(carLatitude, carLongitude);
                    }


                    pushLocation(signal.native_latitude, signal.native_longitude, carLatitude, carLongitude);

                    pushValue(signal.status, 'Awake :grinning:', teslaTimestamp);
                
                    update_timestamp(teslaTimestamp);
                }
                else {
                    console.log('Car is asleep...will resume when car wakes up.')
                    pushValue(signal.status, 'Sleeping :sleeping:');
                
                    // readline.question(`Would you like to wake up the car?`, (input) => {

                    //     if (input == 'yes') {
                    //         wake_up_vehicle();
                    //     }
                    //     else if (input == 'no') {
                    //         console.log("Not waking up");
                    //     }
                    //     readline.close();
                    //     })
                }
            } else {
                console.log("Reauthenticate!");
                process.exit(0);
            }
        } else {
            console.log('Servers are having problems...will resume when car wakes up.')
        }
    };
        
    var options = { 
                    method: 'GET',
                    url: 'https://' + base_url.tesla + path.data,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + tesla.access_token,
                        'User-Agent': '007',
                                }
                    };
    
    request(options, function (error, response, body, status) {
        if (error) {
            console.log(error)
            throw new Error(error);
        }

        process_state_response(body);

        function onErr(err) {
            console.log(err);
            return 1;
        }
    });
};

function wake_up_vehicle() {

    function process_wake_up(my_obj){ 
        
        my_obj = JSON.parse(my_obj); 
        if (program.show_api_responses) {
            console.log(my_obj);
        }
    };

    var body = JSON.stringify({
    });

    var options = {
                    hostname : base_url.tesla,
                    path: path.wake_up,
                    method: 'POST',
                    headers: {
                            'Content-Type': 'application/json',
                            'User-Agent': '007',
                            'Authorization': 'Bearer ' + tesla.access_token,
                             }
                };
    var request = https.request(options, function(response) {
        response.on('data', function (body) {
            process_wake_up(body);
        });
    });

    request.on('error', function(e) {
        console.log('Problem with request: ' + e.message);
    });

    request.write(body);
    request.end();
};

function update_weather() {
    
    function process_weather_response(this_obj){
        
        this_obj = JSON.parse(this_obj);
    
        if (program.show_api_responses) {
            console.log('Dark Sky Response:');
            console.log(this_obj);
        }

        var sunriseUtcSeconds = this_obj.daily.data[0].sunriseTime;
        var sunsetUtcSeconds = this_obj.daily.data[0].sunsetTime;

        var sunriseDate = new Date(0); // The 0 there is the key, which sets the date to the epoch
        var sunsetDate = new Date(0); // The 0 there is the key, which sets the date to the epoch

        sunriseDate.setUTCSeconds(sunriseUtcSeconds);
        sunsetDate.setUTCSeconds(sunsetUtcSeconds);

        pushValue(signal.outside_temperature, this_obj.currently.temperature + ' °F');

        let sunriseMinutes = Number(sunriseDate.getMinutes());

        if (sunriseMinutes < 10){
            sunriseMinutes = '0' + sunriseMinutes;
        }

        pushValue(signal.sunrise, sunriseDate.getHours() + ':' +  sunriseMinutes + ' AM')

        let sunsetMinutes = Number(sunsetDate.getMinutes());

        if (sunsetMinutes < 10){
            sunsetMinutes = '0' + sunsetMinutes;
        }

        pushValue(signal.sunset, sunsetDate.getHours() - 12 + ':' + sunsetMinutes + ' PM')

    };

    var options = { 
                    method: 'GET',
                    url: base_url.darkSky + '/' + darkSky.key + '/' + home.lat + ',' + home.lon,
                    };
    
    
    request(options, function (error, response, body, status) {
        if (error) {
            console.log(error)
            throw new Error(error);
        }
        process_weather_response(body); //vehicle_id is actually the id_s in the response
    
        function onErr(err) {
            console.log(err);
            return 1;
        }
    });
    update_timestamp();
};

function update_timestamp(seedForDate) {

    if (seedForDate == undefined)
    {
        var date = new Date();
    }
    else
    {
        var date = new Date(seedForDate); 
    } 

    let am_or_pm = 'AM';
    
    let hours = date.getHours();
        if (hours > 12) {
            hours -= 12;
            am_or_pm = 'PM'
        }

        if (hours == 0) {
            hours = 12;
        }
    
    let minutes = date.getMinutes();
        if (minutes < 10)
        {
            minutes = '0' + minutes;
        }

    let seconds = date.getSeconds();

    let year = date.getFullYear();
    let month = date.getMonth();
    let day = date.getDay();

    let timeString = hours + ':' + minutes + ' ' + am_or_pm + ', ' + (month + 1) + '/' + day + '/' + year; 

    pushValue(signal.time_since_last_refresh, timeString);
}

function update_stock() {

    function process_stock_response(this_obj){

        if (this_obj != '[]') {

            this_obj = JSON.parse(this_obj);

            if (program.show_api_responses) {
                console.log('IEX Cloud response:');
                console.log(this_obj);
            }

            pushValue(signal.last_sale_price, '$' + this_obj.latestPrice);

        } else {

            console.log('Response is empty!');
            pushValue(signal.last_sale_price, ':x:');
        }
    };
        
    var options = { method: 'GET',
                    url: base_url.iex_cloud + '/TSLA/quote',
                    qs: { 
                        token: IEX_CLOUD.token,
                        }
                };
    
    request(options, function (error, response, body, status) {
        if (error) {
            console.log(error)
            throw new Error(error);
        }

        process_stock_response(body);
        update_timestamp();

        function onErr(err) {
            console.log(err);
            return 1;
        }
    });
}

function get_range_loss(SoC, ideal_range) {

    let bms_max = ideal_range / (SoC / 100);
    let range_loss_percentage = (1 - ( bms_max / 230 )) * 100;
    range_loss_percentage = (range_loss_percentage).toFixed(2);
    range_loss_percentage = range_loss_percentage + '%';

return (range_loss_percentage);
}

function get_option_codes() {
    
    function process_state_response(this_obj){

        this_obj = JSON.parse(this_obj);
        
        if (this_obj.response != undefined)
        {
            
            if (program.show_api_responses) {
                console.log('OP Codes response:');
                console.log(this_obj);
            }

            let opcodes_table = {
                "MDLS": "Model S",
                "MS03": "Model S",
                "MS04": "Model S",
                "MDLX": "Model X",
                "MDL3": "Model 3",
                "MDLY": "Model Y",
                "RENA": "Region: North America",
                "RENC": "Region: Canada",
                "REEU": "Region: Europe",
                "AD02": "NEMA 14-50",
                "AD04": "European 3-Phase",
                "AD05European": "3-Phase, IT",
                "AD06": "Schuko (1 phase, 230V 13A)",
                "AD07": "Red IEC309 (3 phase, 400V 16A)",
                "AD08": "Blue Charging Adapter",
                "AD09": "Adapter, Swiss (1 phase, 10A)",
                "AD10": "Adapter, Denmark (1 phase, 13A)",
                "AD11": "Adapter, Italy (1 phase, 13A)",
                "AD15": "Adapter,J1772",
                "ADPX2": "Type 2 Public Charging Connector",
                "ADX4": "No European 3-Phase",
                "ADX5": "European 3-Phase, IT",
                "ADX6": "No - Adapter, Schuko (1 phase, 13A)",
                "ADX7": "No - 3-ph Red IEC309 (3 phase, 16A)",
                "ADX9": "No - Adapter, Swiss (1 phase, 10A)",
                "ADX8": "Blue IEC309 (1 phase, 230V 32A)",
                "AF00": "No HEPA Filter,Standard air filter, no air ionizer",
                "AF02": "HEPA Filter",
                "AH00": "No Accessory Hitch",
                "APE1": "Enhanced Autopilot",
                "APF0": "Autopilot Firmware 2.0 Base",
                "APF1": "Autopilot Firmware 2.0 Enhanced",
                "APF2": "Full Self-Driving Capability",
                "APH0": "Autopilot 2.0 Hardware",
                "APH2": "Autopilot 2.0 Hardware",
                "APBS": "Autopilot,Model 3 Autopilot",
                "APH3": "Autopilot 2.5 Hardware",
                "APH4": "Autopilot 3.0 Hardware,Full Self-Driving Computer",
                "APPA": "Autopilot 1.0 Hardware",
                "APPB": "Enhanced Autopilot",
                "AU00": "No Audio Package",
                "AU01": "Ultra High Fidelity Sound",
                "AU3P": "Sound Studio Package, Premium audio package",
                "BC0B": "Black Brake Calipers",
                "BC0R": "Red Brake Calipers",
                "BC3B": "Black Brake Calipers, Model 3",
                "BCMB": "Black Brake Calipers",
                "BCYR": "Performance Brakes",
                "BG30": "No Badge,Model 3",
                "BP00": "No Ludicrous",
                "BP01": "Ludicrous Speed Upgrade",
                "BR00": "No Battery Firmware Limit",
                "BR03": "Battery Firmware Limit (60kWh)",
                "BR05": "Battery Firmware Limit (75kWh)",
                "BS00": "Blind Spot Sensor Package",
                "BS01": "Special Production Flag",
                "BT37": "75 kWh (Model 3)",
                "BT40": "40 kWh",
                "BT60": "60 kWh",
                "BT70": "70 kWh",
                "BT85": "85 kWh",
                "BTX4": "90 kWh",
                "BTX5": "75 kWh",
                "BTX6": "100 kWh",
                "BTX7": "75 kWh",
                "BTX8": "85 kWh",
                "CC01": "Five Seat Interior",
                "CC02": "Six Seat Interior",
                "CC04": "Seven Seat Interior",
                "CC12": "Six Seat Interior with Center Console",
                "CDM0": "no CHAdeMO Charging Adaptor",
                "CF00": "High Power Charger",
                "CF01": "48amp charger",
                "CH00": "Standard Charger (40 Amp)",
                "CH01": "Dual Chargers (80 Amp), Twin 10kW charge config",
                "CH04": "72 Amp Charger (Model S/X)",
                "CH05": "48 Amp Charger (Model S/X)",
                "CH07": "48 Amp Charger (Model 3)",
                "COL0": "Signature",
                "COL1": "Solid",
                "COL2": "Metallic",
                "COL3": "Tesla Multi-Coat",
                "COUS": "Country: United States",
                "CONL": "Country: Netherlands",
                "CPW1": "20\"Performance Wheels",
                "CW00": "Weather Package,No Cold Weather Package",
                "CW02": "Weather Package,Subzero Weather Package",
                "DA00": "No Autopilot",
                "DA01": "Active Safety (ACC,LDW,SA),Drivers Assistance Package",
                "DA02": "Autopilot Convenience Features",
                "DCF0": "Autopilot Convenience Features (DCF0)",
                "DRLH": "Left Hand Drive",
                "BC3R": "Performance Brakes,Model 3",
                "DRRH": "Right Hand Drive",
                "DSH5": "Dashboard,PUR Dashboard Pad",
                "DSH7": "Alcantara Dashboard Accents",
                "DSHG": "PUR Dash Pad",
                "DU00": "Drive Unit - IR",
                "DU01": "Drive Unit - Infineon",
                "DV2W": "Rear-Wheel Drive",
                "DV4W": "All-Wheel Drive",
                "FC3P": "Front Console Front Console (Premium),Model 3",
                "FG00": "No Exterior Lighting Package",
                "FG01": "Fog Lamps",
                "Exterior": {},
                "FG02": "Fog Lamps",
                "FG31": "Fog Lamps,Premium Fog Lights (Model 3)",
                "FM3B": "Performance Package (Model 3)",
                "FMP6": "",
                "FR01": "Base Front Row",
                "FR02": "Ventilated Front Seats",
                "FR03": "",
                "FR04": "",
                "GLFR": "Assembly,Final Assembly Fremont",
                "HC00": "No Home Charging installation",
                "HC01": "Home Charging Installation",
                "HM31": "Teck Package, Homelink",
                "HL31": "Head Lamp (Model 3), Uplevel Headlamps",
                "HP00": "No HPWC Ordered",
                "HP01": "HPWC Ordered",
                "ID3W": "(Model 3) Wood Decor",
                "IDBA": "Dark Ash Wood Decor",
                "IDBO": "Figured Ash Wood Decor",
                "IDCF": "Carbon Fiber Decor",
                "IDOK": "Oak Decor",
                "IDOM": "Matte Obeche Wood Decor",
                "IDOG": "Gloss Obeche Wood Decor",
                "IDLW": "Lacewood Decor",
                "IDPB": "Piano Black Decor",
                "IN3BB": "All Black Partial Premium Interior",
                "IN3PB": "All Black Premium Interior",
                "INBBW": "White",
                "INBFP": "Classic Black",
                "INBPP": "Black",
                "INBTB": "Multi-Pattern Black",
                "INFBP": "Black Premium",
                "INLPC": "Cream",
                "INLPP": "Black / Light Headliner",
                "INWPT": "Tan Interior",
                "INYPB": "All Black Premium Interior",
                "INYPW": "Black and White Premium Interior",
                "IL31": "Interior Ambient Lighting",
                "IVBPP": "All Black Interior",
                "IVBSW": "Ultra White Interior",
                "IVBTB": "All Black Interior",
                "IVLPC": "Vegan Cream",
                "IX00": "No Extended Nappa Leather Trim",
                "IX01": "Extended Nappa Leather Trim",
                "LLP1": "",
                "LLP2": "",
                "LP00": "Lighting Package,No Lighting Package",
                "LP01": "Lighting Package,Premium Interior Lighting",
                "LT00": "Vegan interior",
                "LT01": "Standard interior",
                "LT1B": "Lower Trim",
                "LT3W": "",
                "LT4B": "",
                "LT4C": "",
                "LT4W": "",
                "LT5C": "",
                "LT5P": "",
                "LT6P": "",
                "LT6W": "White Base Lower Trim",
                "LTPB": "Lower Trim PUR Black",
                "ME01": "Memory Seats",
                "ME02": "Seat Memory,Seat Memory LHD Driver",
                "MI00": "Project/Program Code M3, Base Manufacturing Intro Code",
                "MI01": "2016 Production Refresh",
                "MI02": "2017 Production Refresh",
                "MR31": "Tech Package - Mirror -YES Uplevel Mirrors",
                "MT300": "Standard Range Rear-Wheel Drive",
                "MT301": "Standard Range Plus Rear-Wheel Drive",
                "MT302": "Long Range Rear-Wheel Drive",
                "MT303": "Long Range All-Wheel Drive",
                "MT304": "Long Range All-Wheel Drive Performance",
                "MT305": "Mid Range Rear-Wheel Drive",
                "MTY02": "Long Range Rear-Wheel Drive",
                "MTY03": "Long Range All-Wheel Drive",
                "MTY04": "Long Range All-Wheel Drive Performance",
                "OSSB": "Safety CA Black",
                "OSSW": "Safety CA White",
                "PA00": "No Paint Armor",
                "PBCW": "Solid White Color",
                "PBSB": "Solid Black Color",
                "PBT8": "Performance 85kWh",
                "PC30": "No Performance Chassis",
                "PC31": "Performance Chassis",
                "PF00": "No Performance Legacy Package",
                "PF01": "Performance Legacy Package",
                "PI00": "No Premium Interior",
                "PI01": "Premium Upgrades Package",
                "PK00": "Parking Sensors",
                "PMAB": "Anza Brown Metallic Color",
                "PMBL": "Obsidian Black Multi-Coat Color",
                "PMMB": "Monterey Blue Metallic Color",
                "PMMR": "Red Multi-Coat Color",
                "PMNG": "Midnight Silver Metallic Color",
                "PMSG": "Green Metallic Color",
                "PMSS": "San Simeon Silver Metallic Color",
                "PMTG": "Dolphin Grey Metallic Color",
                "PPMR": "Red Multi-Coat Color",
                "PPSB": "Deep Blue Metallic Color",
                "PPSR": "Signature Red Color",
                "PPSW": "Pearl White Multi-Coat Color",
                "PPTI": "Titanium Metallic Color",
                "PL30": "No Aluminum Pedal",
                "PL31": "Performance =Pedals Model 3",
                "PRM30": "Partial =Premium Interior",
                "PRM31": "Premium= Interior",
                "PRM3S": "Standard= Interior",
                "PRMY1": "Premium =Interior",
                "PS00": "No Parcel Shelf",
                "PS01": "Parcel Shelf",
                "RS3H": "Second Row Seat Rear Seats (Heated),Model 3",
                "PX00": "No Performance Plus Package",
                "PX01": "Performance Plus",
                "PX6D": "Zero to 60 in 2.5 sec",
                "QLBS": "Black Premium Interior",
                "QLFC": "Cream Premium Interior",
                "QLFP": "Black Premium Interior",
                "QLFW": "White Premium Interior",
                "QLWS": "White Premium Interior",
                "QNET": "Tan NextGen",
                "QPBT": "Black Textile Interior",
                "QPMP": "Black seats",
                "QTBS": "Black Premium Interior",
                "QTBW": "White Premium Seats",
                "QTFC": "Cream Premium Interior",
                "QTFP": "Black Premium Seats",
                "QTFW": "White Premium Interior",
                "QTPC": "Cream Premium Seats",
                "QTPP": "Black Premium Seats",
                "QTPT": "Tan Premium Seats",
                "QTTB": "Multi-Pattern Black Seats",
                "QTWS": "White Premium Interior",
                "QVBM": "Multi-Pattern Black Seats",
                "QVPC": "Vegan Cream Seats",
                "QVPP": "Vegan Cream Seats",
                "QVSW": "White Tesla Seats",
                "RCX0": "No Rear Console",
                "RCX1": "Rear Console",
                "RF3G": "Model 3 Glass Roof",
                "RFBK": "Black Roof",
                "RFBC": "Body Color Roof",
                "RFFG": "Glass Roof",
                "RFP0": "All Glass Panoramic Roof",
                "RFP2": "Sunroof",
                "RFPX": "Model X Roof",
                "S01B": "Black Textile Seats",
                "S02B": "SeatBLK LeatherS02",
                "S07W": "White Seats",
                "S31B": "",
                "S32C": "",
                "S32P": "",
                "S32W": "",
                "S3PB": "Seat Black PUR Premium Seats",
                "SC00": "No Supercharging",
                "SC01": "Supercharging Enabled",
                "SC04": "Pay Per Use Supercharging",
                "SC05": "Free Supercharging",
                "SLR0": "No Rear Spoiler",
                "SP00": "No Security Package",
                "SR01": "Standard 2nd row,Second Row Seat",
                "SR06": "Seven Seat Interior",
                "SR07": "Standard 2nd row",
                "ST00": "Non-leather Steering Wheel",
                "ST01": "Non-heated Leather Steering Wheel",
                "ST31": "Steering Wheel, Premium Steering Wheel",
                "STCP": "Steering Wheel, Steering Column (Power)",
                "STY5S": "Five Seat Interior",
                "STY7S": "Seven Seat Interior",
                "SU00": "Standard Suspension",
                "SU01": "Smart Air Suspension",
                "SU3C": "Suspension, Coil spring suspension",
                "T3MA": "Tires M3, 18 Michelin All Season, Square",
                "TIC4": "Tires, All-Season Tires",
                "TIG2": "Summer Tires",
                "TIM7": "Summer Tires",
                "TIMP": "Tires,Michelin Primacy 19\" Tire",
                "TIP0": "All-season Tires",
                "TM00": "Model Trim, General Production Series Vehicle",
                "TM02": "General Production Signature Trim",
                "TM0A": "ALPHA PRE-PRODUCTION NON-SALEABLE",
                "TM0B": "BETA PRE-PRODUCTION NON-SALEABLE",
                "TM0C": "PRE-PRODUCTION SALEABLE",
                "TP01": "Tech Package - No Autopilot",
                "TP02": "Tech Package with Autopilot",
                "TP03": "Tech Package with Enhanced Autopilot",
                "TR00": "No Rear Facing Seats",
                "TR01": "Third Row Seating",
                "TRA1": "Third Row HVAC",
                "TW00": "No Tow Package",
                "TW01": "Tow Package",
                "UM01": "Universal Mobile Charger - US Port (Single)",
                "UT3P": "Suede Grey Premium Headliner",
                "UTAB": "Black Alcantara Headliner",
                "UTAW": "Light Headliner",
                "UTMF": "Headliner",
                "UTPB": "Dark Headliner",
                "UTSB": "Dark Headliner",
                "UTZW": "Light Headliner",
                "USSB": "Safety,Safety US Black",
                "USSW": "US Safety Kit White",
                "SLR1": "Carbon Fibre Spoiler, Model 3",
                "SPT31": "Performance Upgrade, Model 3",
                "SPTY1": "Performance Upgrade, Model Y",
                "W32P": "20\" Performance Wheels, Model 3",
                "W38B": "18\" Aero Wheels,For the Model 3 and Model Y",
                "W39B": "19\" Sport Wheels",
                "WR00": "No Wrap",
                "WT19": "19\" Wheels",
                "WT20": "20\" Silver Slipstream Wheels",
                "WT22": "22\" Silver Turbine Wheels",
                "WTAB": "21\" Black Arachnid Wheels",
                "WTAS": "19\" Silver Slipstream Wheels",
                "WTDS": "19\" Grey Slipstream Wheels",
                "WTNN": "20\" Nokian Winter Tires (non-studded)",
                "WTNS": "20\" Nokian Winter Tires (studded)",
                "WTP2": "20\" Pirelli Winter Tires",
                "WTSC": "20\" Sonic Carbon Wheels",
                "WTSG": "21\" Turbine Wheels",
                "WTSP": "21\" Turbine Wheels",
                "WTSS": "21\" Turbine Wheels",
                "WTTB": "19\" Cyclone Wheels",
                "WTTC": "21\" Sonic Carbon Twin Turbine Wheels",
                "WTUT": "22\" Onyx Black Wheels",
                "WTW2": "19\" Nokian Winter Wheel Set",
                "WTW3": "19\" Pirelli Winter Wheel Set",
                "WTW4": "19\" Winter Tire Set",
                "WTW5": "21\" Winter Tire Set",
                "WTW6": "19\" Nokian Winter Tires (studded)",
                "WTW7": "19\" Nokian Winter Tires (non-studded)",
                "WTW8": "19\" Pirelli Winter Tires",
                "WTX1": "19\" Michelin Primacy Tire Upgrade",
                "WXNN": "No 20\" Nokian Winter Tires (non-studded)",
                "WXNS": "No 20\" Nokian Winter Tires (studded)",
                "WXP2": "No 20\" Pirelli Winter Tires",
                "WXW2": "No 19\" Wheels with Nokian Winter Tyres",
                "WXW3": "No 19\" Wheels with Pirelli Winter Tyres",
                "WXW4": "No 19\" Winter Tire Set",
                "WXW5": "No 21\" Winter Tire Set",
                "WXW6": "No 19\" Nokian Winter Tires (studded)",
                "WXW7": "No 19\" Nokian Winter Tires (non-studded)",
                "WXW8": "No 19\" Pirelli Winter Tires",
                "WY18B": "18\" Aero Wheels",
                "WY19B": "19\" Sport Wheels",
                "WY20P": "20\" Performance Wheels",
                "X001": "Override: Power Liftgate",
                "X003": "Maps & Navigation",
                "X004": "Override: No Navigation",
                "X007": "Daytime running lights",
                "X010": "Base Mirrors",
                "X011": "Override: Homelink",
                "X012": "Override: No Homelink",
                "X013": "Override: Satellite Radio",
                "X014": "Override: No Satellite Radio",
                "X019": "Carbon Fiber Spoiler",
                "X020": "No Performance Exterior",
                "X021": "No Rear Carbon Fiber Spoiler",
                "X024": "Performance Package",
                "X025": "Performance Powertrain",
                "X027": "Lighted Door Handles",
                "X028": "Battery Badge",
                "X029": "Remove Battery Badge",
                "X030": "Override: No Passive Entry Pkg",
                "X031": "Keyless Entry",
                "X037": "Powerfolding Mirrors",
                "X039": "DAB Radio",
                "X040": "No DAB Radio",
                "X041": "No Auto Presenting Door",
                "X042": "Auto Presenting Door",
                "X043": "No Phone Dock Kit",
                "X044": "Phone Dock Kit",
                "YF00": "No Yacht Floor",
                "YF01": "Matching Yacht Floor",
                "YFFC": "Integrated Center Console"
            }

            let option_codes = this_obj.response.option_codes;
            let opcodes_array = option_codes.split(',');
            let undefined_codes = [];
            let undefined_index = 0;

            opcodes_array.sort();

            for (i = 0; i < opcodes_array.length; i++) {
                if (opcodes_table[opcodes_array[i]] != undefined) {
                    console.log(opcodes_array[i] + ' : ' + opcodes_table[opcodes_array[i]]);
                }
                else { // If Undefined
                    undefined_codes[undefined_index] = opcodes_array[i];
                    ++undefined_index;
                }
            }

            undefined_codes.sort();

            for (j = 0; j < undefined_codes.length; j++) {
                console.log(undefined_codes[j] + ' : ' + '[Undefined]');
            }

            let teslaTimestamp = this_obj.response.charge_state.timestamp;
            update_timestamp(teslaTimestamp);

        }
        else {
            
            console.log('Car is asleep...will resume when car wakes up.')
        
        }
    };
        
    var options = { 
                    method: 'GET',
                    url: 'https://' + base_url.tesla + path.data,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + tesla.access_token,
                        'User-Agent': '007',
                                }
                    };
    
    request(options, function (error, response, body, status) {
        if (error) {
            console.log(error)
            throw new Error(error);
        }

        process_state_response(body);

        function onErr(err) {
            console.log(err);
            return 1;
        }
    });
};

function reverse_geocode(latpar, lonpar) {

    latpar = 41.496211
    lonpar = -81.6874176

    if ((latpar == undefined) && (lonpar == undefined)) { // If the location of car isnt specified, use default home coordinates
        // latpar = home.lat;
        // lonpar = home.lon;
    }

    function process_mapquest_response(this_obj){

        this_obj = JSON.parse(this_obj);

        if (program.show_api_responses) {
            console.log('Mapquest Response:');
            console.log(this_obj);
        }

        let street = this_obj.results[0].locations[0].street;
        let city = this_obj.results[0].locations[0].adminArea5;
        let state = this_obj.results[0].locations[0].adminArea3;
        let postal_code = this_obj.results[0].locations[0].postalCode;

        if (city.length == 0 && postal_code == '44067') {
            city = 'Sagamore Hills';
        }

        if (street.length == 0) {
            city = '[Unknown Street]'
        } else if (city.length == 0) {
            city = '[Unknown City]'
        } else if (state.length == 0) {
            city = '[Unknown State]'
        } else if (postal_code.length == 0) {
            city = '[Unknown Postal Code]'
        }

        let address_string = street + ' ' + city + ', ' + state + ' ' + postal_code;

        pushValue(signal.location_reverse_geocoded, address_string);

        update_timestamp();
    };
    
    console.log("Lat going to Mapuest: " + latpar);
    console.log("Lon going to Mapuest: " + lonpar);
    var options = { 
                    method: 'GET',
                    url: base_url.mapquest + path.reverse_geocode + '?key=' + mapquest.key + '&location=' + latpar + ',' + lonpar + '&thumbMaps=false&outFormat=json&=&=',
                };
    
    request(options, function (error, response, body, status) {
        if (error) {
            console.log(error)
            throw new Error(error);
        }

        process_mapquest_response(body);

        function onErr(err) {
            console.log(err);
            return 1;
        }
    });

}

function main() {

    console.log(''.padStart(60, ' '));
    console.log(''.padStart(60, ' '));
    console.log(''.padStart(60, ' '));
    console.log(''.padStart(60, ' '));
    console.log(''.padStart(60, ' '));
    console.log(''.padStart(60, ' '));
    console.log(''.padStart(60, ' '));
    console.log(''.padStart(60, ' '));
    console.log(''.padStart(60, ' '));
    console.log(''.padStart(60, ' '));
    console.log(''.padStart(60, ' '));
    console.log(''.padStart(60, ' '));

    console.log(''.padStart(60, '-'));
    console.log('          Tesla Dashboard - Powered By Initial State');
    console.log(''.padStart(60, '-'));
    console.log('Menu'.padStart(28, ' '));
    console.log(''.padStart(60, '-'));
    
    readline.question(`                Option 1: Authenticate
                Option 2: Get Vehicle ID
                Option 3: Get Option Codes
                Option 4: Get Vehicle Data
                Option 5: Wake up Vehicle
                Option 6: Update Weather
                Option 7: Update All
                Option 8: Repeat Indefinitely
                Option 9: Update TSLA stock
                Option 10: Reverse geocode location
------------------------------------------------------------
`, (input) => {
        switch(input) {
            case '1':
                authenticate();
            break;
            case '2':
                get_vehicle_id();
            break;
            case '3':
                get_option_codes();
                break;
            case '4':
                get_state();
                break;
            case '5':
                wake_up_vehicle();
                break;
            case '6':
                update_weather();
                break;
            case '7':
                get_state();
                update_weather();
                update_stock();
                break;
            case '8':
                var cycles = 0;
                function refreshData() {

                    x = program.polling_delay; // Timeout in seconds
                    cycles = cycles + 1;
                    
                    if (cycles == 1) {
                        console.log('Starting program with a ' + x + ' second polling frquency.') 
                        console.log(''.padStart(60, '-'));
                    }
                    else {
                        console.log('Program is running with a ' + x + ' second polling frequency.')
                        console.log('Vehicle has been polled ' + cycles + ' times this session.')
                        console.log(''.padStart(60, '-')); 
                    }
                
                    pushValue(signal.update_count, cycles);
                    
                    get_state();
                    update_weather();

                    if ((cycles % 2) == 1) {
                        update_stock(); //update every other time (will update first time through execution)
                    }
                    
                    setTimeout(refreshData, x * 1000);
                }
                refreshData();
                break;
            case '9':
                update_stock();
                break;
            case '10':
                reverse_geocode();
                break;
        }
        readline.close();
    })
}

main();
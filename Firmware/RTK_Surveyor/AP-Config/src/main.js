//var ws = new WebSocket("ws://192.168.1.105/ws"); //WiFi mode
var ws = new WebSocket("ws://192.168.4.1/ws"); //AP Mode

ws.onmessage = function (msg) {
    parseIncoming(msg.data);
};

function ge(e) {
    return document.getElementById(e);
}

var platformPrefix = "Surveyor";
var geodeticLat = 40.01;
var geodeticLon = -105.19;
var geodeticAlt = 1500.1;
var ecefX = -1280206.568;
var ecefY = -4716804.403;
var ecefZ = 4086665.484;

function parseIncoming(msg) {
    //console.log("incoming message: " + msg);

    var data = msg.split(',');
    for (let x = 0; x < data.length - 1; x += 2) {
        var id = data[x];
        var val = data[x + 1];
        //console.log("id: " + id + ", val: " + val);

        //Special commands
        if (id.includes("sdMounted")) {
            //Turn on/off SD area
            if (val == "false") {
                hide("sdMounted");
            }
            else if (val == "true") {
                show("sdMounted");
            }
        }
        else if (id == "platformPrefix") {
            platformPrefix = val;
            document.title = "RTK " + platformPrefix + " Setup";

            if (platformPrefix == "Surveyor") {
                hide("dataPortChannelDropdown");

                hide("sensorConfig");
                hide("ppConfig");
            }
            else if (platformPrefix == "Express" || platformPrefix == "Facet") {
                hide("sensorConfig");
                hide("ppConfig");
            }
            else if (platformPrefix == "Express Plus") {
                ge("muxChannel2").innerHTML = "Wheel/Dir Encoder";

                hide("baseConfig");
                hide("ppConfig");

                hide("msgUBX_NAV_SVIN"); //Hide unsupported messages
                hide("msgUBX_RTCM_1005");
                hide("msgUBX_RTCM_1074");
                hide("msgUBX_RTCM_1077");
                hide("msgUBX_RTCM_1084");
                hide("msgUBX_RTCM_1087");

                hide("msgUBX_RTCM_1094");
                hide("msgUBX_RTCM_1097");
                hide("msgUBX_RTCM_1124");
                hide("msgUBX_RTCM_1127");
                hide("msgUBX_RTCM_1230");

                hide("msgUBX_RTCM_4072_0");
                hide("msgUBX_RTCM_4072_1");

                show("msgUBX_ESF_MEAS");
                show("msgUBX_ESF_RAW");
                show("msgUBX_ESF_STATUS");
                show("msgUBX_ESF_ALG");
                show("msgUBX_ESF_INS");
            }
            else if (platformPrefix == "Facet L-Band") {
                hide("sensorConfig");
                show("ppConfig");
            }
        }
        //Strings generated by RTK unit
        else if (id.includes("sdFreeSpace")
            || id.includes("sdUsedSpace")
            || id.includes("rtkFirmwareVersion")
            || id.includes("zedFirmwareVersion")
            || id.includes("hardwareID")
            || id.includes("daysRemaining")
            || id.includes("profile0Name")
            || id.includes("profile1Name")
            || id.includes("profile2Name")
            || id.includes("profile3Name")
            || id.includes("profile4Name")
            || id.includes("profile5Name")
            || id.includes("profile6Name")
            || id.includes("profile7Name")
            || id.includes("radioMAC")
            || id.includes("deviceBTID")
        ) {
            ge(id).innerHTML = val;
        }
        else if (id.includes("profileNumber")) {
            currentProfileNumber = val;
            $("input[name=profileRadio][value=" + currentProfileNumber + "]").prop('checked', true);
        }
        else if (id.includes("firmwareUploadComplete")) {
            firmwareUploadComplete();
        }
        else if (id.includes("firmwareUploadStatus")) {
            firmwareUploadStatus(val);
        }
        else if (id.includes("geodeticLat")) {
            geodeticLat = val;
            ge(id).innerHTML = val;
        }
        else if (id.includes("geodeticLon")) {
            geodeticLon = val;
            ge(id).innerHTML = val;
        }
        else if (id.includes("geodeticAlt")) {
            geodeticAlt = val;
            ge(id).innerHTML = val;
        }
        else if (id.includes("ecefX")) {
            ecefX = val;
            ge(id).innerHTML = val;
        }
        else if (id.includes("ecefY")) {
            ecefY = val;
            ge(id).innerHTML = val;
        }
        else if (id.includes("ecefZ")) {
            ecefZ = val;
            ge(id).innerHTML = val;
        }
        else if (id.includes("espnowPeerCount")) {
            if (val > 0)
                ge("peerMACs").innerHTML = "";
        }
        else if (id.includes("peerMAC")) {
            ge("peerMACs").innerHTML += val + "<br>";
        }
        else if (id.includes("stationECEF")) {
            recordsECEF.push(val);
        }
        else if (id.includes("stationGeodetic")) {
            recordsGeodetic.push(val);
        }

        //Check boxes / radio buttons
        else if (val == "true") {
            try {
                ge(id).checked = true;
            } catch (error) {
                console.log("Issue with ID: " + id)
            }
        }
        else if (val == "false") {
            try {
                ge(id).checked = false;
            } catch (error) {
                console.log("Issue with ID: " + id)
            }
        }

        //All regular input boxes and values
        else {
            try {
                ge(id).value = val;
            } catch (error) {
                console.log("Issue with ID: " + id)
            }
        }
    }
    //console.log("Settings loaded");

    ge("profileChangeMessage").innerHTML = '';
    ge("resetProfileMsg").innerHTML = '';

    //Force element updates
    ge("measurementRateHz").dispatchEvent(new CustomEvent('change'));
    ge("baseTypeSurveyIn").dispatchEvent(new CustomEvent('change'));
    ge("baseTypeFixed").dispatchEvent(new CustomEvent('change'));
    ge("fixedBaseCoordinateTypeECEF").dispatchEvent(new CustomEvent('change'));
    ge("fixedBaseCoordinateTypeGeo").dispatchEvent(new CustomEvent('change'));
    ge("enableLogging").dispatchEvent(new CustomEvent('change'));
    ge("enableNtripClient").dispatchEvent(new CustomEvent('change'));
    ge("enableNtripServer").dispatchEvent(new CustomEvent('change'));
    ge("dataPortChannel").dispatchEvent(new CustomEvent('change'));
    ge("enableExternalPulse").dispatchEvent(new CustomEvent('change'));
    ge("enablePointPerfectCorrections").dispatchEvent(new CustomEvent('change'));
    ge("radioType").dispatchEvent(new CustomEvent('change'));
    updateECEFList();
    updateGeodeticList();
}

function hide(id) {
    ge(id).style.display = "none";
}

function show(id) {
    ge(id).style.display = "block";
}

//Create CSV of all setting data
function sendData() {
    var settingCSV = "";

    //Input boxes
    var clsElements = document.querySelectorAll(".form-control, .form-dropdown");
    for (let x = 0; x < clsElements.length; x++) {
        settingCSV += clsElements[x].id + "," + clsElements[x].value + ",";
    }

    //Check boxes, radio buttons
    clsElements = document.querySelectorAll(".form-check-input, .form-radio");
    for (let x = 0; x < clsElements.length; x++) {
        settingCSV += clsElements[x].id + "," + clsElements[x].checked + ",";
    }

    for (let x = 0; x < recordsECEF.length; x++) {
        settingCSV += "stationECEF" + x + ',' + recordsECEF[x] + ",";
    }

    for (let x = 0; x < recordsGeodetic.length; x++) {
        settingCSV += "stationGeodetic" + x + ',' + recordsGeodetic[x] + ",";
    }

    console.log("Sending: " + settingCSV);
    ws.send(settingCSV);
}

function showError(id, errorText) {
    ge(id + 'Error').innerHTML = '<br>Error: ' + errorText;
}

function clearError(id) {
    ge(id + 'Error').innerHTML = '';
}

function showSuccess(id, msg) {
    ge(id + 'Success').innerHTML = '<br>Success: ' + msg;
}

function clearSuccess(id) {
    ge(id + 'Success').innerHTML = '';
}

var errorCount = 0;

function checkMessageValue(id) {
    checkElementValue(id, 0, 255, "Must be between 0 and 255", "collapseGNSSConfigMsg");
}

function collapseSection(section, caret) {
    ge(section).classList.remove('show');
    ge(caret).classList.remove('icon-caret-down');
    ge(caret).classList.remove('icon-caret-up');
    ge(caret).classList.add('icon-caret-down');
}

function validateFields() {
    //Collapse all sections
    collapseSection("collapseProfileConfig", "profileCaret");
    collapseSection("collapseGNSSConfig", "gnssCaret");
    collapseSection("collapseGNSSConfigMsg", "gnssMsgCaret");
    collapseSection("collapseBaseConfig", "baseCaret");
    collapseSection("collapseSensorConfig", "sensorCaret");
    collapseSection("collapsePPConfig", "pointPerfectCaret");
    collapseSection("collapsePortsConfig", "portsCaret");
    collapseSection("collapseRadioConfig", "radioCaret");
    collapseSection("collapseSystemConfig", "systemCaret");

    errorCount = 0;

    //Profile Config
    checkElementString("profileName", 1, 49, "Must be 1 to 49 characters", "collapseProfileConfig");

    //GNSS Config
    checkElementValue("measurementRateHz", 0.00012, 10, "Must be between 0.00012 and 10Hz", "collapseGNSSConfig");
    checkConstellations();

    if (ge("enableNtripClient").checked) {
        checkElementString("ntripClient_wifiSSID", 1, 30, "Must be 1 to 30 characters", "collapseGNSSConfig");
        checkElementString("ntripClient_wifiPW", 0, 30, "Must be 0 to 30 characters", "collapseGNSSConfig");
        checkElementString("ntripClient_CasterHost", 1, 30, "Must be 1 to 30 characters", "collapseGNSSConfig");
        checkElementValue("ntripClient_CasterPort", 1, 99999, "Must be 1 to 99999", "collapseGNSSConfig");
        checkElementString("ntripClient_MountPoint", 1, 30, "Must be 1 to 30 characters", "collapseGNSSConfig");
    }
    else {
        clearElement("ntripClient_wifiSSID", "TRex");
        clearElement("ntripClient_wifiPW", "parachutes");
        clearElement("ntripClient_CasterHost", "rtk2go.com");
        clearElement("ntripClient_CasterPort", 2101);
        clearElement("ntripClient_MountPoint", "bldr_SparkFun1");
        clearElement("ntripClient_MountPointPW");
        clearElement("ntripClient_CasterUser", "");
        clearElement("ntripClient_CasterUserPW", "");
        ge("ntripClient_TransmitGGA").checked = true;
    }

    checkMessageValue("UBX_NMEA_DTM");
    checkMessageValue("UBX_NMEA_GBS");
    checkMessageValue("UBX_NMEA_GGA");
    checkMessageValue("UBX_NMEA_GLL");
    checkMessageValue("UBX_NMEA_GNS");

    checkMessageValue("UBX_NMEA_GRS");
    checkMessageValue("UBX_NMEA_GSA");
    checkMessageValue("UBX_NMEA_GST");
    checkMessageValue("UBX_NMEA_GSV");
    checkMessageValue("UBX_NMEA_RMC");

    checkMessageValue("UBX_NMEA_VLW");
    checkMessageValue("UBX_NMEA_VTG");
    checkMessageValue("UBX_NMEA_ZDA");

    checkMessageValue("UBX_NAV_ATT");
    checkMessageValue("UBX_NAV_CLOCK");
    checkMessageValue("UBX_NAV_DOP");
    checkMessageValue("UBX_NAV_EOE");
    checkMessageValue("UBX_NAV_GEOFENCE");

    checkMessageValue("UBX_NAV_HPPOSECEF");
    checkMessageValue("UBX_NAV_HPPOSLLH");
    checkMessageValue("UBX_NAV_ODO");
    checkMessageValue("UBX_NAV_ORB");
    checkMessageValue("UBX_NAV_POSECEF");

    checkMessageValue("UBX_NAV_POSLLH");
    checkMessageValue("UBX_NAV_PVT");
    checkMessageValue("UBX_NAV_RELPOSNED");
    checkMessageValue("UBX_NAV_SAT");
    checkMessageValue("UBX_NAV_SIG");

    checkMessageValue("UBX_NAV_STATUS");
    checkMessageValue("UBX_NAV_SVIN");
    checkMessageValue("UBX_NAV_TIMEBDS");
    checkMessageValue("UBX_NAV_TIMEGAL");
    checkMessageValue("UBX_NAV_TIMEGLO");

    checkMessageValue("UBX_NAV_TIMEGPS");
    checkMessageValue("UBX_NAV_TIMELS");
    checkMessageValue("UBX_NAV_TIMEUTC");
    checkMessageValue("UBX_NAV_VELECEF");
    checkMessageValue("UBX_NAV_VELNED");

    checkMessageValue("UBX_RXM_MEASX");
    checkMessageValue("UBX_RXM_RAWX");
    checkMessageValue("UBX_RXM_RLM");
    checkMessageValue("UBX_RXM_RTCM");
    checkMessageValue("UBX_RXM_SFRBX");

    checkMessageValue("UBX_MON_COMMS");
    checkMessageValue("UBX_MON_HW2");
    checkMessageValue("UBX_MON_HW3");
    checkMessageValue("UBX_MON_HW");
    checkMessageValue("UBX_MON_IO");

    checkMessageValue("UBX_MON_MSGPP");
    checkMessageValue("UBX_MON_RF");
    checkMessageValue("UBX_MON_RXBUF");
    checkMessageValue("UBX_MON_RXR");
    checkMessageValue("UBX_MON_TXBUF");

    checkMessageValue("UBX_TIM_TM2");
    checkMessageValue("UBX_TIM_TP");
    checkMessageValue("UBX_TIM_VRFY");

    checkMessageValue("UBX_RTCM_1005");
    checkMessageValue("UBX_RTCM_1074");
    checkMessageValue("UBX_RTCM_1077");
    checkMessageValue("UBX_RTCM_1084");
    checkMessageValue("UBX_RTCM_1087");

    checkMessageValue("UBX_RTCM_1094");
    checkMessageValue("UBX_RTCM_1097");
    checkMessageValue("UBX_RTCM_1124");
    checkMessageValue("UBX_RTCM_1127");
    checkMessageValue("UBX_RTCM_1230");

    checkMessageValue("UBX_RTCM_4072_0");
    checkMessageValue("UBX_RTCM_4072_1");

    if (platformPrefix == "Express Plus") {
        checkMessageValue("UBX_ESF_MEAS");
        checkMessageValue("UBX_ESF_RAW");
        checkMessageValue("UBX_ESF_STATUS");
        checkMessageValue("UBX_ESF_ALG");
        checkMessageValue("UBX_ESF_INS");
    }

    //Base Config
    if (platformPrefix != "Express Plus") {
        if (ge("baseTypeSurveyIn").checked) {
            checkElementValue("observationSeconds", 60, 600, "Must be between 60 to 600", "collapseBaseConfig");
            checkElementValue("observationPositionAccuracy", 1, 5.1, "Must be between 1.0 to 5.0", "collapseBaseConfig");

            clearElement("fixedEcefX", -1280206.568);
            clearElement("fixedEcefY", -4716804.403);
            clearElement("fixedEcefZ", 4086665.484);
            clearElement("fixedLat", 40.09029479);
            clearElement("fixedLong", -105.18505761);
            clearElement("fixedAltitude", 1560.089);
            clearElement("antennaHeight", 0);
            clearElement("antennaReferencePoint", 0);
            clearElement("antennaHeightCurrentConfig", 0);
            clearElement("antennaReferencePointCurrentConfig", 0);
        }
        else if (ge("baseTypeFixed").checked) {
            clearElement("observationSeconds", 60);
            clearElement("observationPositionAccuracy", 5.0);
            clearElement("antennaHeightCurrentConfig", 0);
            clearElement("antennaReferencePointCurrentConfig", 0);

            if (ge("fixedBaseCoordinateTypeECEF").checked) {
                clearElement("fixedLat", 40.09029479);
                clearElement("fixedLong", -105.18505761);
                clearElement("fixedAltitude", 1560.089);

                checkElementValue("fixedEcefX", -7000000, 7000000, "Must be -7000000 to 7000000", "collapseBaseConfig");
                checkElementValue("fixedEcefY", -7000000, 7000000, "Must be -7000000 to 7000000", "collapseBaseConfig");
                checkElementValue("fixedEcefZ", -7000000, 7000000, "Must be -7000000 to 7000000", "collapseBaseConfig");
            }
            else {
                clearElement("fixedEcefX", -1280206.568);
                clearElement("fixedEcefY", -4716804.403);
                clearElement("fixedEcefZ", 4086665.484);

                checkElementValue("fixedLat", -180, 180, "Must be -180 to 180", "collapseBaseConfig");
                checkElementValue("fixedLong", -180, 180, "Must be -180 to 180", "collapseBaseConfig");
                checkElementValue("fixedAltitude", -11034, 8849, "Must be -11034 to 8849", "collapseBaseConfig");

                checkElementValue("antennaHeight", -15000, 15000, "Must be -15000 to 15000", "collapseBaseConfig");
                checkElementValue("antennaReferencePoint", -200.0, 200.0, "Must be -200.0 to 200.0", "collapseBaseConfig");
            }
        }
        else if (ge("baseTypeUseCurrent").checked) {
            checkElementValue("antennaHeightCurrentConfig", -15000, 15000, "Must be -15000 to 15000", "collapseBaseConfig");
            checkElementValue("antennaReferencePointCurrentConfig", -200.0, 200.0, "Must be -200.0 to 200.0", "collapseBaseConfig");

            clearElement("observationSeconds", 60);
            clearElement("observationPositionAccuracy", 5.0);
            clearElement("fixedEcefX", -1280206.568);
            clearElement("fixedEcefY", -4716804.403);
            clearElement("fixedEcefZ", 4086665.484);
            clearElement("fixedLat", 40.09029479);
            clearElement("fixedLong", -105.18505761);
            clearElement("fixedAltitude", 1560.089);
            clearElement("antennaHeight", 0);
            clearElement("antennaReferencePoint", 0);
        }

        if (ge("enableNtripServer").checked == true) {
            checkElementString("ntripServer_wifiSSID", 1, 30, "Must be 1 to 30 characters", "collapseBaseConfig");
            checkElementString("ntripServer_wifiPW", 0, 30, "Must be 0 to 30 characters", "collapseBaseConfig");
            checkElementString("ntripServer_CasterHost", 1, 30, "Must be 1 to 30 characters", "collapseBaseConfig");
            checkElementValue("ntripServer_CasterPort", 1, 99999, "Must be 1 to 99999", "collapseBaseConfig");
            checkElementString("ntripServer_MountPoint", 1, 30, "Must be 1 to 30 characters", "collapseBaseConfig");
            checkElementString("ntripServer_MountPointPW", 1, 30, "Must be 1 to 30 characters", "collapseBaseConfig");
        }
        else {
            clearElement("ntripServer_wifiSSID", "TRex");
            clearElement("ntripServer_wifiPW", "parachutes");
            clearElement("ntripServer_CasterHost", "rtk2go.com");
            clearElement("ntripServer_CasterPort", 2101);
            clearElement("ntripServer_CasterUser", "");
            clearElement("ntripServer_CasterUserPW", "");
            clearElement("ntripServer_MountPoint", "bldr_dwntwn2");
            clearElement("ntripServer_MountPointPW", "WR5wRo4H");
        }
    }

    //L-Band Config
    if (platformPrefix == "Facet L-Band") {
        if (ge("enablePointPerfectCorrections").checked == true) {
            checkElementString("home_wifiSSID", 1, 30, "Must be 1 to 30 characters", "collapsePPConfig");
            checkElementString("home_wifiPW", 0, 30, "Must be 0 to 30 characters", "collapsePPConfig");

            value = ge("pointPerfectDeviceProfileToken").value;
            console.log(value);
            if (value.length > 0)
                checkElementString("pointPerfectDeviceProfileToken", 36, 36, "Must be 36 characters", "collapsePPConfig");
        }
        else {
            clearElement("home_wifiSSID", "");
            clearElement("home_wifiPW", "");
            clearElement("pointPerfectDeviceProfileToken", "");
            ge("autoKeyRenewal").checked = true;
        }
    }

    //System Config
    if (ge("enableLogging").checked) {
        checkElementValue("maxLogTime_minutes", 1, 1051200, "Must be 1 to 1,051,200", "collapseSystemConfig");
        checkElementValue("maxLogLength_minutes", 1, 1051200, "Must be 1 to 1,051,200", "collapseSystemConfig");
    }
    else {
        clearElement("maxLogTime_minutes", 60 * 24);
        clearElement("maxLogLength_minutes", 60 * 24);
    }

    //Port Config
    if (platformPrefix != "Surveyor") {
        if (ge("enableExternalPulse").checked) {
            checkElementValue("externalPulseTimeBetweenPulse_us", 1, 60000000, "Must be 1 to 60,000,000", "collapsePortsConfig");
            checkElementValue("externalPulseLength_us", 1, 60000000, "Must be 1 to 60,000,000", "collapsePortsConfig");
        }
        else {
            clearElement("externalPulseTimeBetweenPulse_us", 100000);
            clearElement("externalPulseLength_us", 900000);
            ge("externalPulsePolarity").value = 0;
        }
    }
}

var currentProfileNumber = 0;

function changeConfig() {
    validateFields();

    if (errorCount == 1) {
        showError('saveBtn', "Please clear " + errorCount + " error");
        clearSuccess('saveBtn');
        $("input[name=profileRadio][value=" + currentProfileNumber + "]").prop('checked', true);
    }
    else if (errorCount > 1) {
        showError('saveBtn', "Please clear " + errorCount + " errors");
        clearSuccess('saveBtn');
        $("input[name=profileRadio][value=" + currentProfileNumber + "]").prop('checked', true);
    }
    else {
        ge("profileChangeMessage").innerHTML = 'Loading. Please wait...';

        currentProfileNumber = document.querySelector('input[name=profileRadio]:checked').value;

        sendData();
        clearError('saveBtn');
        showSuccess('saveBtn', "All saved!");

        ws.send("setProfile," + currentProfileNumber + ",");

        ge("collapseProfileConfig").classList.add('show');
        ge("collapseGNSSConfig").classList.add('show');
        collapseSection("collapseGNSSConfigMsg", "gnssMsgCaret");
        collapseSection("collapseBaseConfig", "baseCaret");
        collapseSection("collapseSensorConfig", "sensorCaret");
        collapseSection("collapsePPConfig", "pointPerfectCaret");
        collapseSection("collapsePortsConfig", "portsCaret");
        collapseSection("collapseSystemConfig", "systemCaret");
    }
}

function saveConfig() {
    validateFields();

    if (errorCount == 1) {
        showError('saveBtn', "Please clear " + errorCount + " error");
        clearSuccess('saveBtn');
    }
    else if (errorCount > 1) {
        showError('saveBtn', "Please clear " + errorCount + " errors");
        clearSuccess('saveBtn');
    }
    else {
        //Tell Arduino we're ready to save
        sendData();
        clearError('saveBtn');
        showSuccess('saveBtn', "All saved!");
    }

}

function checkConstellations() {
    if (ge("ubxConstellationsGPS").checked == false
        && ge("ubxConstellationsGalileo").checked == false
        && ge("ubxConstellationsBeiDou").checked == false
        && ge("ubxConstellationsGLONASS").checked == false
    ) {
        ge("collapseGNSSConfig").classList.add('show');
        showError('ubxConstellations', "Please choose one constellation");
        errorCount++;
    }
    else
        clearError("ubxConstellations");
}

function checkBitMapValue(id, min, max, bitMap, errorText, collapseID) {
    value = ge(id).value;
    mask = ge(bitMap).value;
    if ((value < min) || (value > max) || ((mask & (1 << value)) == 0)) {
        ge(id + 'Error').innerHTML = 'Error: ' + errorText;
        ge(collapseID).classList.add('show');
        errorCount++;
    }
    else {
        clearError(id);
    }
}

function checkElementValue(id, min, max, errorText, collapseID) {
    value = ge(id).value;
    if (value < min || value > max || value == "") {
        ge(id + 'Error').innerHTML = 'Error: ' + errorText;
        ge(collapseID).classList.add('show');
        if (collapseID == "collapseGNSSConfigMsg") ge("collapseGNSSConfig").classList.add('show');
        errorCount++;
    }
    else
        clearError(id);
}

function checkElementString(id, min, max, errorText, collapseID) {
    value = ge(id).value;
    if (value.length < min || value.length > max) {
        ge(id + 'Error').innerHTML = 'Error: ' + errorText;
        ge(collapseID).classList.add('show');
        errorCount++;
    }
    else
        clearError(id);
}

function clearElement(id, value) {
    ge(id).value = value;
    clearError(id);
}

function resetToFactoryDefaults() {
    ge("factoryDefaultsMsg").innerHTML = "Defaults Applied. Please wait for device reset...";
    ws.send("factoryDefaultReset,1,");
}

function zeroElement(id) {
    ge(id).value = 0;
}

function zeroMessages() {
    zeroElement("UBX_NMEA_DTM");
    zeroElement("UBX_NMEA_GBS");
    zeroElement("UBX_NMEA_GGA");
    zeroElement("UBX_NMEA_GLL");
    zeroElement("UBX_NMEA_GNS");

    zeroElement("UBX_NMEA_GRS");
    zeroElement("UBX_NMEA_GSA");
    zeroElement("UBX_NMEA_GST");
    zeroElement("UBX_NMEA_GSV");
    zeroElement("UBX_NMEA_RMC");

    zeroElement("UBX_NMEA_VLW");
    zeroElement("UBX_NMEA_VTG");
    zeroElement("UBX_NMEA_ZDA");

    zeroElement("UBX_NAV_ATT");
    zeroElement("UBX_NAV_CLOCK");
    zeroElement("UBX_NAV_DOP");
    zeroElement("UBX_NAV_EOE");
    zeroElement("UBX_NAV_GEOFENCE");

    zeroElement("UBX_NAV_HPPOSECEF");
    zeroElement("UBX_NAV_HPPOSLLH");
    zeroElement("UBX_NAV_ODO");
    zeroElement("UBX_NAV_ORB");
    zeroElement("UBX_NAV_POSECEF");

    zeroElement("UBX_NAV_POSLLH");
    zeroElement("UBX_NAV_PVT");
    zeroElement("UBX_NAV_RELPOSNED");
    zeroElement("UBX_NAV_SAT");
    zeroElement("UBX_NAV_SIG");

    zeroElement("UBX_NAV_STATUS");
    zeroElement("UBX_NAV_SVIN");
    zeroElement("UBX_NAV_TIMEBDS");
    zeroElement("UBX_NAV_TIMEGAL");
    zeroElement("UBX_NAV_TIMEGLO");

    zeroElement("UBX_NAV_TIMEGPS");
    zeroElement("UBX_NAV_TIMELS");
    zeroElement("UBX_NAV_TIMEUTC");
    zeroElement("UBX_NAV_VELECEF");
    zeroElement("UBX_NAV_VELNED");

    zeroElement("UBX_RXM_MEASX");
    zeroElement("UBX_RXM_RAWX");
    zeroElement("UBX_RXM_RLM");
    zeroElement("UBX_RXM_RTCM");
    zeroElement("UBX_RXM_SFRBX");

    zeroElement("UBX_MON_COMMS");
    zeroElement("UBX_MON_HW2");
    zeroElement("UBX_MON_HW3");
    zeroElement("UBX_MON_HW");
    zeroElement("UBX_MON_IO");

    zeroElement("UBX_MON_MSGPP");
    zeroElement("UBX_MON_RF");
    zeroElement("UBX_MON_RXBUF");
    zeroElement("UBX_MON_RXR");
    zeroElement("UBX_MON_TXBUF");

    zeroElement("UBX_TIM_TM2");
    zeroElement("UBX_TIM_TP");
    zeroElement("UBX_TIM_VRFY");

    zeroElement("UBX_RTCM_1005");
    zeroElement("UBX_RTCM_1074");
    zeroElement("UBX_RTCM_1077");
    zeroElement("UBX_RTCM_1084");
    zeroElement("UBX_RTCM_1087");

    zeroElement("UBX_RTCM_1094");
    zeroElement("UBX_RTCM_1097");
    zeroElement("UBX_RTCM_1124");
    zeroElement("UBX_RTCM_1127");
    zeroElement("UBX_RTCM_1230");

    zeroElement("UBX_RTCM_4072_0");
    zeroElement("UBX_RTCM_4072_1");

    zeroElement("UBX_ESF_MEAS");
    zeroElement("UBX_ESF_RAW");
    zeroElement("UBX_ESF_STATUS");
    zeroElement("UBX_ESF_ALG");
    zeroElement("UBX_ESF_INS");
}
function resetToNmeaDefaults() {
    zeroMessages();
    ge("UBX_NMEA_GGA").value = 1;
    ge("UBX_NMEA_GSA").value = 1;
    ge("UBX_NMEA_GST").value = 1;
    ge("UBX_NMEA_GSV").value = 4;
    ge("UBX_NMEA_RMC").value = 1;
}
function resetToLoggingDefaults() {
    zeroMessages();
    ge("UBX_NMEA_GGA").value = 1;
    ge("UBX_NMEA_GSA").value = 1;
    ge("UBX_NMEA_GST").value = 1;
    ge("UBX_NMEA_GSV").value = 4;
    ge("UBX_NMEA_RMC").value = 1;
    ge("UBX_RXM_RAWX").value = 1;
    ge("UBX_RXM_SFRBX").value = 1;
}
function useECEFCoordinates() {
    ge("fixedEcefX").value = ecefX;
    ge("fixedEcefY").value = ecefY;
    ge("fixedEcefZ").value = ecefZ;
}
function useGeodeticCoordinates() {
    ge("fixedLat").value = geodeticLat;
    ge("fixedLong").value = geodeticLon;
    ge("fixedAltitude").value = geodeticAlt;
}

function startNewLog() {
    ws.send("startNewLog,1,");
}

function exitConfig() {
    show("exitPage");
    hide("mainPage");
    ws.send("exitAndReset,1,");
}

function firmwareUploadWait() {
    ge("firmwareUploadMsg").innerHTML = "<br>Uploading, please wait...";
}

function firmwareUploadStatus(val) {
    ge("firmwareUploadMsg").innerHTML = val;
}

function firmwareUploadComplete() {
    show("firmwareUploadComplete");
    hide("mainPage");
}

function forgetPairedRadios() {
    ge("btnForgetRadiosMsg").innerHTML = "All radios forgotten.";
    ge("peerMACs").innerHTML = "None";
    ws.send("forgetEspNowPeers,1,");
}

function btnResetProfile() {
    ge("resetProfileMsg").innerHTML = "Resetting profile.";
    ws.send("resetProfile,1,");
}

document.addEventListener("DOMContentLoaded", (event) => {

    var radios = document.querySelectorAll('input[name=profileRadio]');
    for (var i = 0, max = radios.length; i < max; i++) {
        radios[i].onclick = function () {
            changeConfig();
        }
    }

    ge("measurementRateHz").addEventListener("change", function () {
        ge("measurementRateSec").value = 1.0 / ge("measurementRateHz").value;
    });

    ge("measurementRateSec").addEventListener("change", function () {
        ge("measurementRateHz").value = 1.0 / ge("measurementRateSec").value;
    });

    ge("baseTypeFixed").addEventListener("change", function () {
        if (ge("baseTypeFixed").checked) {
            show("fixedConfig");
            hide("useCurrentConfig");
            hide("surveyInConfig");
        }
    });

    ge("baseTypeUseCurrent").addEventListener("change", function () {
        if (ge("baseTypeUseCurrent").checked) {
            hide("fixedConfig");
            show("useCurrentConfig");
            hide("surveyInConfig");
        }
    });

    ge("baseTypeSurveyIn").addEventListener("change", function () {
        if (ge("baseTypeSurveyIn").checked) {
            hide("fixedConfig");
            hide("useCurrentConfig");
            show("surveyInConfig");
        }
    });

    ge("fixedBaseCoordinateTypeECEF").addEventListener("change", function () {
        if (ge("fixedBaseCoordinateTypeECEF").checked) {
            show("ecefConfig");
            hide("geodeticConfig");
        }
    });

    ge("fixedBaseCoordinateTypeGeo").addEventListener("change", function () {
        if (ge("fixedBaseCoordinateTypeGeo").checked) {
            hide("ecefConfig");
            show("geodeticConfig");
        }
    });

    ge("enableNtripServer").addEventListener("change", function () {
        if (ge("enableNtripServer").checked) {
            show("ntripServerConfig");
        }
        else {
            hide("ntripServerConfig");
        }
    });

    ge("enableNtripClient").addEventListener("change", function () {
        if (ge("enableNtripClient").checked) {
            show("ntripClientConfig");
        }
        else {
            hide("ntripClientConfig");
        }
    });

    ge("enableFactoryDefaults").addEventListener("change", function () {
        if (ge("enableFactoryDefaults").checked) {
            ge("factoryDefaults").disabled = false;
        }
        else {
            ge("factoryDefaults").disabled = true;
        }
    });

    ge("dataPortChannel").addEventListener("change", function () {
        if (ge("dataPortChannel").value == 0) {
            show("dataPortBaudDropdown");
            hide("externalPulseConfig");
        }
        else if (ge("dataPortChannel").value == 1) {
            hide("dataPortBaudDropdown");
            show("externalPulseConfig");
        }
        else {
            hide("dataPortBaudDropdown");
            hide("externalPulseConfig");
        }
    });

    ge("dynamicModel").addEventListener("change", function () {
        if (ge("dynamicModel").value != 4 && ge("enableSensorFusion").checked) {
            ge("dynamicModelSensorFusionError").innerHTML = "<br>Warning: Dynamic Model not set to Automotive. Sensor Fusion is best used with the Automotive Dynamic Model.";
        }
        else {
            ge("dynamicModelSensorFusionError").innerHTML = "";
        }
    });

    ge("enableSensorFusion").addEventListener("change", function () {
        if (ge("dynamicModel").value != 4 && ge("enableSensorFusion").checked) {
            ge("dynamicModelSensorFusionError").innerHTML = "<br>Warning: Dynamic Model not set to Automotive. Sensor Fusion is best used with the Automotive Dynamic Model.";
        }
        else {
            ge("dynamicModelSensorFusionError").innerHTML = "";
        }
    });

    ge("enablePointPerfectCorrections").addEventListener("change", function () {
        if (ge("enablePointPerfectCorrections").checked) {
            show("ppSettingsConfig");
        }
        else {
            hide("ppSettingsConfig");
        }
    });

    ge("enableExternalPulse").addEventListener("change", function () {
        if (ge("enableExternalPulse").checked) {
            show("externalPulseConfigDetails");
        }
        else {
            hide("externalPulseConfigDetails");
        }
    });

    ge("radioType").addEventListener("change", function () {
        if (ge("radioType").value == 0) {
            hide("radioDetails");
        }
        else if (ge("radioType").value == 1) {
            show("radioDetails");
        }
    });

    ge("enableForgetRadios").addEventListener("change", function () {
        if (ge("enableForgetRadios").checked) {
            ge("btnForgetRadios").disabled = false;
        }
        else {
            ge("btnForgetRadios").disabled = true;
        }
    });

    ge("enableLogging").addEventListener("change", function () {
        if (ge("enableLogging").checked) {
            show("enableLoggingDetails");
        }
        else {
            hide("enableLoggingDetails");
        }
    });
})

var recordsECEF = [];
var recordsGeodetic = [];

var bLen0 = 0;
var bLen1 = 0;
var bLen2 = 0;

function addECEF() {
    errorCount = 0;

    nicknameECEF.value = removeBadChars(nicknameECEF.value);

    checkElementString("nicknameECEF", 1, 49, "Must be 1 to 49 characters", "collapseBaseConfig");
    checkElementValue("fixedEcefX", -7000000, 7000000, "Must be -7000000 to 7000000", "collapseBaseConfig");
    checkElementValue("fixedEcefY", -7000000, 7000000, "Must be -7000000 to 7000000", "collapseBaseConfig");
    checkElementValue("fixedEcefZ", -7000000, 7000000, "Must be -7000000 to 7000000", "collapseBaseConfig");

    if (errorCount == 0) {
        //Check name against the list
        var index = 0;
        for (; index < recordsECEF.length; ++index) {
            var parts = recordsECEF[index].split(' ');
            if (ge("nicknameECEF").value == parts[0]) {
                recordsECEF[index] = nicknameECEF.value + ' ' + fixedEcefX.value + ' ' + fixedEcefY.value + ' ' + fixedEcefZ.value;
                break;
            }
        }
        if (index == recordsECEF.length)
            recordsECEF.push(nicknameECEF.value + ' ' + fixedEcefX.value + ' ' + fixedEcefY.value + ' ' + fixedEcefZ.value);
    }

    updateECEFList();
}

function deleteECEF() {
    var val = ge("StationCoordinatesECEF").value;
    if (val > "")
        recordsECEF.splice(val, 1);
    updateECEFList();
}

function loadECEF() {
    var val = ge("StationCoordinatesECEF").value;
    if (val > "") {
        var parts = recordsECEF[val].split(' ');
        ge("fixedEcefX").value = parts[1];
        ge("fixedEcefY").value = parts[2];
        ge("fixedEcefZ").value = parts[3];
        ge("nicknameECEF").value = parts[0];
        clearError("fixedEcefX");
        clearError("fixedEcefY");
        clearError("fixedEcefZ");
        clearError("nicknameECEF");
    }
}

//Based on recordsECEF array, update and monospace HTML list
function updateECEFList() {
    ge("StationCoordinatesECEF").length = 0;

    if (recordsECEF.length == 0) {
        hide("StationCoordinatesECEF");
        nicknameECEFText.innerHTML = "No coordinates stored";
    }
    else {
        show("StationCoordinatesECEF");
        nicknameECEFText.innerHTML = "Nickname: X/Y/Z";
        if (recordsECEF.length < 5)
            ge("StationCoordinatesECEF").size = recordsECEF.length;
    }

    for (let index = 0; index < recordsECEF.length; ++index) {
        var option = document.createElement('option');
        option.text = recordsECEF[index];
        option.value = index;
        ge("StationCoordinatesECEF").add(option);
    }

    $("#StationCoordinatesECEF option").each(function () {
        var parts = $(this).text().split(' ');
        var nickname = parts[0].substring(0, 15);
        $(this).text(nickname + ': ' + parts[1] + ' ' + parts[2] + ' ' + parts[3]).text;
    });
}

function addGeodetic() {
    errorCount = 0;

    nicknameGeodetic.value = removeBadChars(nicknameGeodetic.value);

    checkElementString("nicknameGeodetic", 1, 49, "Must be 1 to 49 characters", "collapseBaseConfig");
    checkElementValue("fixedLat", -180, 180, "Must be -180 to 180", "collapseBaseConfig");
    checkElementValue("fixedLong", -180, 180, "Must be -180 to 180", "collapseBaseConfig");
    checkElementValue("fixedAltitude", -11034, 8849, "Must be -11034 to 8849", "collapseBaseConfig");

    if (errorCount == 0) {
        //Check name against the list
        var index = 0;
        for (; index < recordsGeodetic.length; ++index) {
            var parts = recordsGeodetic[index].split(' ');
            if (ge("nicknameGeodetic").value == parts[0]) {
                recordsGeodetic[index] = nicknameGeodetic.value + ' ' + fixedLat.value + ' ' + fixedLong.value + ' ' + fixedAltitude.value;
                break;
            }
        }
        if (index == recordsGeodetic.length)
            recordsGeodetic.push(nicknameGeodetic.value + ' ' + fixedLat.value + ' ' + fixedLong.value + ' ' + fixedAltitude.value);
    }

    updateGeodeticList();
}

function deleteGeodetic() {
    var val = ge("StationCoordinatesGeodetic").value;
    if (val > "")
        recordsGeodetic.splice(val, 1);
    updateGeodeticList();
}

function loadGeodetic() {
    var val = ge("StationCoordinatesGeodetic").value;
    if (val > "") {
        var parts = recordsGeodetic[val].split(' ');
        ge("fixedLat").value = parts[1];
        ge("fixedLong").value = parts[2];
        ge("fixedAltitude").value = parts[3];
        ge("nicknameGeodetic").value = parts[0];
        clearError("fixedLat");
        clearError("fixedLong");
        clearError("fixedAltitude");
        clearError("nicknameGeodetic");
    }
}

//Based on recordsGeodetic array, update and monospace HTML list
function updateGeodeticList() {
    ge("StationCoordinatesGeodetic").length = 0;

    if (recordsGeodetic.length == 0) {
        hide("StationCoordinatesGeodetic");
        nicknameGeodeticText.innerHTML = "No coordinates stored";
    }
    else {
        show("StationCoordinatesGeodetic");
        nicknameGeodeticText.innerHTML = "Nickname: Lat/Long/Alt";
        if (recordsGeodetic.length < 5)
            ge("StationCoordinatesGeodetic").size = recordsGeodetic.length;
    }

    for (let index = 0; index < recordsGeodetic.length; ++index) {

        var option = document.createElement('option');
        option.text = recordsGeodetic[index];
        option.value = index;
        ge("StationCoordinatesGeodetic").add(option);
    }

    $("#StationCoordinatesGeodetic option").each(function () {
        var parts = $(this).text().split(' ');
        var nickname = parts[0].substring(0, 15);
        $(this).text(nickname + ': ' + parts[1] + ' ' + parts[2] + ' ' + parts[3]).text;
    });
}

function removeBadChars(val) {
    val = val.split(' ').join('');
    val = val.split(',').join('');
    val = val.split('\\').join('');
    return (val);
}
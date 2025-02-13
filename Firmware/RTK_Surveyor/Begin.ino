//Initial startup functions for GNSS, SD, display, radio, etc

//Based on hardware features, determine if this is RTK Surveyor or RTK Express hardware
//Must be called after Wire.begin so that we can do I2C tests
void beginBoard()
{
  //Use ADC to check resistor divider
  int pin_adc_rtk_facet = 35;
  uint16_t idValue = analogReadMilliVolts(pin_adc_rtk_facet);
  log_d("Board ADC ID: %d", idValue);

  if (idValue > (3300 / 2 * 0.9) && idValue < (3300 / 2 * 1.1))
  {
    productVariant = RTK_FACET;
  }
  else if (idValue > (3300 * 2 / 3 * 0.9) && idValue < (3300 * 2 / 3 * 1.1))
  {
    productVariant = RTK_FACET_LBAND;
  }
  else if (idValue > (3300 * 3.3 / 13.3 * 0.9) && idValue < (3300 * 3.3 / 13.3 * 1.1))
  {
    productVariant = RTK_EXPRESS;
  }
  else if (idValue > (3300 * 10 / 13.3 * 0.9) && idValue < (3300 * 10 / 13.3 * 1.1))
  {
    productVariant = RTK_EXPRESS_PLUS;
  }
  else if (isConnected(0x19) == true) //Check for accelerometer
  {
    if (zedModuleType == PLATFORM_F9P) productVariant = RTK_EXPRESS;
    else if (zedModuleType == PLATFORM_F9R) productVariant = RTK_EXPRESS_PLUS;
  }
  else
  {
    productVariant = RTK_SURVEYOR;
  }

  //Setup hardware pins
  if (productVariant == RTK_SURVEYOR)
  {
    pin_batteryLevelLED_Red = 32;
    pin_batteryLevelLED_Green = 33;
    pin_positionAccuracyLED_1cm = 2;
    pin_positionAccuracyLED_10cm = 15;
    pin_positionAccuracyLED_100cm = 13;
    pin_baseStatusLED = 4;
    pin_bluetoothStatusLED = 12;
    pin_setupButton = 5;
    pin_microSD_CS = 25;
    pin_zed_tx_ready = 26;
    pin_zed_reset = 27;
    pin_batteryLevel_alert = 36;

    //Bug in ZED-F9P v1.13 firmware causes RTK LED to not light when RTK Floating with SBAS on.
    //The following changes the POR default but will be overwritten by settings in NVM or settings file
    settings.ubxConstellations[1].enabled = false;

    strcpy(platformFilePrefix, "SFE_Surveyor");
    strcpy(platformPrefix, "Surveyor");
  }
  else if (productVariant == RTK_EXPRESS || productVariant == RTK_EXPRESS_PLUS)
  {
    pin_muxA = 2;
    pin_muxB = 4;
    pin_powerSenseAndControl = 13;
    pin_setupButton = 14;
    pin_microSD_CS = 25;
    pin_dac26 = 26;
    pin_powerFastOff = 27;
    pin_adc39 = 39;

    pinMode(pin_powerSenseAndControl, INPUT_PULLUP);
    pinMode(pin_powerFastOff, INPUT);

    if (esp_reset_reason() == ESP_RST_POWERON)
    {
      powerOnCheck(); //Only do check if we POR start
    }

    pinMode(pin_setupButton, INPUT_PULLUP);

    setMuxport(settings.dataPortChannel); //Set mux to user's choice: NMEA, I2C, PPS, or DAC

    if (productVariant == RTK_EXPRESS)
    {
      strcpy(platformFilePrefix, "SFE_Express");
      strcpy(platformPrefix, "Express");
    }
    else if (productVariant == RTK_EXPRESS_PLUS)
    {
      strcpy(platformFilePrefix, "SFE_Express_Plus");
      strcpy(platformPrefix, "Express Plus");
    }
  }
  else if (productVariant == RTK_FACET || productVariant == RTK_FACET_LBAND)
  {
    //v11
    pin_muxA = 2;
    pin_muxB = 0;
    pin_powerSenseAndControl = 13;
    pin_peripheralPowerControl = 14;
    pin_microSD_CS = 25;
    pin_dac26 = 26;
    pin_powerFastOff = 27;
    pin_adc39 = 39;

    pin_radio_rx = 33;
    pin_radio_tx = 32;
    pin_radio_rst = 15;
    pin_radio_pwr = 4;
    pin_radio_cts = 5;
    //pin_radio_rts = 255; //Not implemented

    pinMode(pin_powerSenseAndControl, INPUT_PULLUP);
    pinMode(pin_powerFastOff, INPUT);

    if (esp_reset_reason() == ESP_RST_POWERON)
    {
      powerOnCheck(); //Only do check if we POR start
    }

    pinMode(pin_peripheralPowerControl, OUTPUT);
    digitalWrite(pin_peripheralPowerControl, HIGH); //Turn on SD, ZED, etc

    setMuxport(settings.dataPortChannel); //Set mux to user's choice: NMEA, I2C, PPS, or DAC

    //CTS is active low. ESP32 pin 5 has pullup at POR. We must drive it low.
    pinMode(pin_radio_cts, OUTPUT);
    digitalWrite(pin_radio_cts, LOW);

    if (productVariant == RTK_FACET)
    {
      strcpy(platformFilePrefix, "SFE_Facet");
      strcpy(platformPrefix, "Facet");
    }
    else if (productVariant == RTK_FACET_LBAND)
    {
      strcpy(platformFilePrefix, "SFE_Facet_LBand");
      strcpy(platformPrefix, "Facet L-Band");
    }
  }

  Serial.printf("SparkFun RTK %s v%d.%d-%s\r\n", platformPrefix, FIRMWARE_VERSION_MAJOR, FIRMWARE_VERSION_MINOR, __DATE__);

  //Get unit MAC address
  esp_read_mac(wifiMACAddress, ESP_MAC_WIFI_STA);
  memcpy(btMACAddress, wifiMACAddress, sizeof(wifiMACAddress));
  btMACAddress[5] += 2; //Convert MAC address to Bluetooth MAC (add 2): https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/system.html#mac-address

  //For all boards, check reset reason. If reset was due to wdt or panic, append last log
  loadSettingsPartial(); //Loads settings from LFS
  if (esp_reset_reason() == ESP_RST_POWERON)
  {
    reuseLastLog = false; //Start new log

    if (settings.enableResetDisplay == true)
    {
      settings.resetCount = 0;
      recordSystemSettingsToFileLFS(settingsFileName); //Avoid overwriting LittleFS settings onto SD
    }
    settings.resetCount = 0;
  }
  else
  {
    reuseLastLog = true; //Attempt to reuse previous log

    if (settings.enableResetDisplay == true)
    {
      settings.resetCount++;
      Serial.printf("resetCount: %d\r\n", settings.resetCount);
      recordSystemSettingsToFileLFS(settingsFileName); //Avoid overwriting LittleFS settings onto SD
    }

    Serial.print("Reset reason: ");
    switch (esp_reset_reason())
    {
      case ESP_RST_UNKNOWN: Serial.println("ESP_RST_UNKNOWN"); break;
      case ESP_RST_POWERON : Serial.println("ESP_RST_POWERON"); break;
      case ESP_RST_SW : Serial.println("ESP_RST_SW"); break;
      case ESP_RST_PANIC : Serial.println("ESP_RST_PANIC"); break;
      case ESP_RST_INT_WDT : Serial.println("ESP_RST_INT_WDT"); break;
      case ESP_RST_TASK_WDT : Serial.println("ESP_RST_TASK_WDT"); break;
      case ESP_RST_WDT : Serial.println("ESP_RST_WDT"); break;
      case ESP_RST_DEEPSLEEP : Serial.println("ESP_RST_DEEPSLEEP"); break;
      case ESP_RST_BROWNOUT : Serial.println("ESP_RST_BROWNOUT"); break;
      case ESP_RST_SDIO : Serial.println("ESP_RST_SDIO"); break;
      default : Serial.println("Unknown");
    }
  }
}

void beginSD()
{
  bool gotSemaphore;

  online.microSD = false;
  gotSemaphore = false;
  while (settings.enableSD == true)
  {
    //Setup SD card access semaphore
    if (sdCardSemaphore == NULL)
      sdCardSemaphore = xSemaphoreCreateMutex();
    else if (xSemaphoreTake(sdCardSemaphore, fatSemaphore_shortWait_ms) != pdPASS)
    {
      //This is OK since a retry will occur next loop
      log_d("sdCardSemaphore failed to yield, Begin.ino line %d", __LINE__);
      break;
    }
    gotSemaphore = true;
    markSemaphore(FUNCTION_BEGINSD);

    pinMode(pin_microSD_CS, OUTPUT);
    digitalWrite(pin_microSD_CS, HIGH); //Be sure SD is deselected

    //Allocate the data structure that manages the microSD card
    if (!sd)
    {
      sd = new SdFat();
      if (!sd)
      {
        log_d("Failed to allocate the SdFat structure!");
        break;
      }
    }

    //Do a quick test to see if a card is present
    int tries = 0;
    int maxTries = 5;
    while (tries < maxTries)
    {
      if (sdPresent() == true) break;
      //log_d("SD present failed. Trying again %d out of %d", tries + 1, maxTries);

      //Max power up time is 250ms: https://www.kingston.com/datasheets/SDCIT-specsheet-64gb_en.pdf
      //Max current is 200mA average across 1s, peak 300mA
      delay(10);
      tries++;
    }
    if (tries == maxTries) break;

    //If an SD card is present, allow SdFat to take over
    log_d("SD card detected");

    if (settings.spiFrequency > 16)
    {
      Serial.println("Error: SPI Frequency out of range. Default to 16MHz");
      settings.spiFrequency = 16;
    }

    if (sd->begin(SdSpiConfig(pin_microSD_CS, SHARED_SPI, SD_SCK_MHZ(settings.spiFrequency))) == false)
    {
      tries = 0;
      maxTries = 1;
      for ( ; tries < maxTries ; tries++)
      {
        log_d("SD init failed. Trying again %d out of %d", tries + 1, maxTries);

        delay(250); //Give SD more time to power up, then try again
        if (sd->begin(SdSpiConfig(pin_microSD_CS, SHARED_SPI, SD_SCK_MHZ(settings.spiFrequency))) == true) break;
      }

      if (tries == maxTries)
      {
        Serial.println("SD init failed. Is card present? Formatted?");
        digitalWrite(pin_microSD_CS, HIGH); //Be sure SD is deselected
        break;
      }
    }

    //Change to root directory. All new file creation will be in root.
    if (sd->chdir() == false)
    {
      Serial.println("SD change directory failed");
      break;
    }

    if (createTestFile() == false)
    {
      Serial.println("Failed to create test file. Format SD card with 'SD Card Formatter'.");
      displaySDFail(5000);
      break;
    }

    //Load firmware file from the microSD card if it is present
    scanForFirmware();

    Serial.println("microSD: Online");
    online.microSD = true;
    break;
  }

  //Free the semaphore
  if (sdCardSemaphore && gotSemaphore)
    xSemaphoreGive(sdCardSemaphore);  //Make the file system available for use
}

void endSD(bool alreadyHaveSemaphore, bool releaseSemaphore)
{
  //Disable logging
  endLogging(alreadyHaveSemaphore, false);

  //Done with the SD card
  if (online.microSD)
  {
    sd->end();
    online.microSD = false;
    Serial.println("microSD: Offline");
  }

  //Free the caches for the microSD card
  if (sd)
  {
    delete sd;
    sd = NULL;
  }

  //Release the semaphore
  if (releaseSemaphore)
    xSemaphoreGive(sdCardSemaphore);
}

//We want the UART2 interrupts to be pinned to core 0 to avoid competing with I2C interrupts
//We do not start the UART2 for GNSS->BT reception here because the interrupts would be pinned to core 1
//We instead start a task that runs on core 0, that then begins serial
//See issue: https://github.com/espressif/arduino-esp32/issues/3386
void beginUART2()
{
  rBuffer = (uint8_t*)malloc(settings.gnssHandlerBufferSize);

  if (pinUART2TaskHandle == NULL) xTaskCreatePinnedToCore(
      pinUART2Task,
      "UARTStart", //Just for humans
      2000, //Stack Size
      NULL, //Task input parameter
      0, // Priority, with 3 (configMAX_PRIORITIES - 1) being the highest, and 0 being the lowest
      &pinUART2TaskHandle, //Task handle
      0); //Core where task should run, 0=core, 1=Arduino

  while (uart2pinned == false) //Wait for task to run once
    delay(1);
}

//Assign UART2 interrupts to the core 0. See: https://github.com/espressif/arduino-esp32/issues/3386
void pinUART2Task( void *pvParameters )
{
  serialGNSS.setRxBufferSize(settings.uartReceiveBufferSize);
  serialGNSS.setTimeout(settings.serialTimeoutGNSS);
  serialGNSS.begin(settings.dataPortBaud); //UART2 on pins 16/17 for SPP. The ZED-F9P will be configured to output NMEA over its UART1 at the same rate.

  //Reduce threshold value above which RX FIFO full interrupt is generated
  //Allows more time between when the UART interrupt occurs and when the FIFO buffer overruns
  //serialGNSS.setRxFIFOFull(50); //Available in >v2.0.5
  uart_set_rx_full_threshold(2, 50); //uart_num, threshold

  uart2pinned = true;

  vTaskDelete( NULL ); //Delete task once it has run once
}

void beginFS()
{
  if (online.fs == false)
  {
    if (LittleFS.begin(true) == false) //Format LittleFS if begin fails
    {
      Serial.println("Error: LittleFS not online");
    }
    else
    {
      Serial.println("LittleFS Started");
      online.fs = true;
    }
  }
}

//Connect to ZED module and identify particulars
void beginGNSS()
{
  if (i2cGNSS.begin() == false)
  {
    log_d("GNSS Failed to begin. Trying again.");

    //Try again with power on delay
    delay(1000); //Wait for ZED-F9P to power up before it can respond to ACK
    if (i2cGNSS.begin() == false)
    {
      displayGNSSFail(1000);
      return;
    }
  }

  //Increase transactions to reduce transfer time
  i2cGNSS.i2cTransactionSize = 128;

  //Check the firmware version of the ZED-F9P. Based on Example21_ModuleInfo.
  if (i2cGNSS.getModuleInfo(1100) == true) // Try to get the module info
  {
    //i2cGNSS.minfo.extension[1] looks like 'FWVER=HPG 1.12'
    strcpy(zedFirmwareVersion, i2cGNSS.minfo.extension[1]);

    //Remove 'FWVER='. It's extraneous and = causes settings file parsing issues
    char *ptr = strstr(zedFirmwareVersion, "FWVER=");
    if (ptr != NULL)
      strcpy(zedFirmwareVersion, ptr + strlen("FWVER="));

    //Convert version to a uint8_t
    if (strstr(zedFirmwareVersion, "1.00") != NULL)
      zedFirmwareVersionInt = 100;
    else if (strstr(zedFirmwareVersion, "1.12") != NULL)
      zedFirmwareVersionInt = 112;
    else if (strstr(zedFirmwareVersion, "1.13") != NULL)
      zedFirmwareVersionInt = 113;
    else if (strstr(zedFirmwareVersion, "1.20") != NULL) //Mostly for F9R HPS 1.20, but also F9P HPG v1.20 Spartan future support
      zedFirmwareVersionInt = 120;
    else if (strstr(zedFirmwareVersion, "1.21") != NULL) //Future F9R HPS v1.21
      zedFirmwareVersionInt = 121;
    else if (strstr(zedFirmwareVersion, "1.30") != NULL) //ZED-F9P released Dec, 2021
      zedFirmwareVersionInt = 130;
    else if (strstr(zedFirmwareVersion, "1.32") != NULL) //ZED-F9P released May, 2022
      zedFirmwareVersionInt = 132;
    else
    {
      Serial.printf("Unknown firmware version: %s\r\n", zedFirmwareVersion);
      zedFirmwareVersionInt = 99; //0.99 invalid firmware version
    }

    //Determine if we have a ZED-F9P (Express/Facet) or an ZED-F9R (Express Plus/Facet Plus)
    if (strstr(i2cGNSS.minfo.extension[3], "ZED-F9P") != NULL)
      zedModuleType = PLATFORM_F9P;
    else if (strstr(i2cGNSS.minfo.extension[3], "ZED-F9R") != NULL)
      zedModuleType = PLATFORM_F9R;
    else
    {
      Serial.printf("Unknown ZED module: %s\r\n", i2cGNSS.minfo.extension[3]);
      zedModuleType = PLATFORM_F9P;
    }

    printZEDInfo(); //Print module type and firmware version
  }

  online.gnss = true;
}

//Configuration can take >1s so configure during splash
void configureGNSS()
{
  if (online.gnss == false) return;

  i2cGNSS.setAutoPVTcallbackPtr(&storePVTdata); // Enable automatic NAV PVT messages with callback to storePVTdata
  i2cGNSS.setAutoHPPOSLLHcallbackPtr(&storeHPdata); // Enable automatic NAV HPPOSLLH messages with callback to storeHPdata

  //Configuring the ZED can take more than 2000ms. We save configuration to
  //ZED so there is no need to update settings unless user has modified
  //the settings file or internal settings.
  if (settings.updateZEDSettings == false)
  {
    log_d("Skipping ZED configuration");
    return;
  }

  bool response = configureUbloxModule();
  if (response == false)
  {
    //Try once more
    Serial.println("Failed to configure GNSS module. Trying again.");
    delay(1000);
    response = configureUbloxModule();

    if (response == false)
    {
      Serial.println("Failed to configure GNSS module.");
      displayGNSSFail(1000);
      online.gnss = false;
      return;
    }
  }

  Serial.println("GNSS configuration complete");
}

//Set LEDs for output and configure PWM
void beginLEDs()
{
  if (productVariant == RTK_SURVEYOR)
  {
    pinMode(pin_positionAccuracyLED_1cm, OUTPUT);
    pinMode(pin_positionAccuracyLED_10cm, OUTPUT);
    pinMode(pin_positionAccuracyLED_100cm, OUTPUT);
    pinMode(pin_baseStatusLED, OUTPUT);
    pinMode(pin_bluetoothStatusLED, OUTPUT);
    pinMode(pin_setupButton, INPUT_PULLUP); //HIGH = rover, LOW = base

    digitalWrite(pin_positionAccuracyLED_1cm, LOW);
    digitalWrite(pin_positionAccuracyLED_10cm, LOW);
    digitalWrite(pin_positionAccuracyLED_100cm, LOW);
    digitalWrite(pin_baseStatusLED, LOW);
    digitalWrite(pin_bluetoothStatusLED, LOW);

    ledcSetup(ledRedChannel, pwmFreq, pwmResolution);
    ledcSetup(ledGreenChannel, pwmFreq, pwmResolution);
    ledcSetup(ledBTChannel, pwmFreq, pwmResolution);

    ledcAttachPin(pin_batteryLevelLED_Red, ledRedChannel);
    ledcAttachPin(pin_batteryLevelLED_Green, ledGreenChannel);
    ledcAttachPin(pin_bluetoothStatusLED, ledBTChannel);

    ledcWrite(ledRedChannel, 0);
    ledcWrite(ledGreenChannel, 0);
    ledcWrite(ledBTChannel, 0);
  }
}

//Configure the on board MAX17048 fuel gauge
void beginFuelGauge()
{
  // Set up the MAX17048 LiPo fuel gauge
  if (lipo.begin() == false)
  {
    Serial.println("Fuel gauge not detected.");
    return;
  }

  online.battery = true;

  //Always use hibernate mode
  if (lipo.getHIBRTActThr() < 0xFF) lipo.setHIBRTActThr((uint8_t)0xFF);
  if (lipo.getHIBRTHibThr() < 0xFF) lipo.setHIBRTHibThr((uint8_t)0xFF);

  Serial.println("MAX17048 configuration complete");

  checkBatteryLevels(); //Force check so you see battery level immediately at power on

  //Check to see if we are dangerously low
  if (battLevel < 5 && battChangeRate < 0.5) //5% and not charging
  {
    Serial.println("Battery too low. Please charge. Shutting down...");

    if (online.display == true)
      displayMessage("Charge Battery", 0);

    delay(2000);

    powerDown(false); //Don't display 'Shutting Down'
  }

}

//Begin accelerometer if available
void beginAccelerometer()
{
  if (accel.begin() == false)
  {
    online.accelerometer = false;

    displayAccelFail(1000);

    return;
  }

  //The larger the avgAmount the faster we should read the sensor
  //accel.setDataRate(LIS2DH12_ODR_100Hz); //6 measurements a second
  accel.setDataRate(LIS2DH12_ODR_400Hz); //25 measurements a second

  Serial.println("Accelerometer configuration complete");

  online.accelerometer = true;
}

//Depending on platform and previous power down state, set system state
void beginSystemState()
{
  if (productVariant == RTK_SURVEYOR)
  {
    //If the rocker switch was moved while off, force module settings
    //When switch is set to '1' = BASE, pin will be shorted to ground
    if (settings.lastState == STATE_ROVER_NOT_STARTED && digitalRead(pin_setupButton) == LOW) settings.updateZEDSettings = true;
    else if (settings.lastState == STATE_BASE_NOT_STARTED && digitalRead(pin_setupButton) == HIGH) settings.updateZEDSettings = true;

    if (online.lband == false)
      systemState = STATE_ROVER_NOT_STARTED; //Assume Rover. ButtonCheckTask() will correct as needed.
    else
      systemState = STATE_KEYS_STARTED; //Begin process for getting new keys

    setupBtn = new Button(pin_setupButton); //Create the button in memory
  }
  else if (productVariant == RTK_EXPRESS || productVariant == RTK_EXPRESS_PLUS)
  {
    if (online.lband == false)
      systemState = settings.lastState; //Return to either Rover or Base Not Started. The last state previous to power down.
    else
      systemState = STATE_KEYS_STARTED; //Begin process for getting new keys

    if (systemState > STATE_SHUTDOWN)
    {
      Serial.println("Unknown state - factory reset");
      factoryReset();
    }

    setupBtn = new Button(pin_setupButton); //Create the button in memory
    powerBtn = new Button(pin_powerSenseAndControl); //Create the button in memory
  }
  else if (productVariant == RTK_FACET || productVariant == RTK_FACET_LBAND)
  {
    if (online.lband == false)
      systemState = settings.lastState; //Return to either Rover or Base Not Started. The last state previous to power down.
    else
      systemState = STATE_KEYS_STARTED; //Begin process for getting new keys

    if (systemState > STATE_SHUTDOWN)
    {
      Serial.println("Unknown state - factory reset");
      factoryReset();
    }

    firstRoverStart = true; //Allow user to enter test screen during first rover start
    if (systemState == STATE_BASE_NOT_STARTED)
      firstRoverStart = false;

    powerBtn = new Button(pin_powerSenseAndControl); //Create the button in memory
  }

  //Starts task for monitoring button presses
  if (ButtonCheckTaskHandle == NULL)
    xTaskCreate(
      ButtonCheckTask,
      "BtnCheck", //Just for humans
      buttonTaskStackSize, //Stack Size
      NULL, //Task input parameter
      ButtonCheckTaskPriority,
      &ButtonCheckTaskHandle); //Task handle
}

//Setup the timepulse output on the PPS pin for external triggering
//Setup TM2 time stamp input as need
bool beginExternalTriggers()
{
  if (online.gnss == false) return (false);

  //If our settings haven't changed, trust ZED's settings
  if (settings.updateZEDSettings == false)
  {
    log_d("Skipping ZED Trigger configuration");
    return (true);
  }

  if (settings.dataPortChannel != MUX_PPS_EVENTTRIGGER)
    return (true); //No need to configure PPS if port is not selected

  bool response = true;

  response &= i2cGNSS.newCfgValset8(UBLOX_CFG_TP_USE_LOCKED_TP1, 1); //Use CFG-TP-PERIOD_LOCK_TP1 and CFG-TP-LEN_LOCK_TP1 as soon as GNSS time is valid
  response &= i2cGNSS.addCfgValset8(UBLOX_CFG_TP_TP1_ENA, settings.enableExternalPulse); //Enable/disable timepulse
  response &= i2cGNSS.addCfgValset8(UBLOX_CFG_TP_PULSE_DEF, 0); //Time pulse definition is a period (in us)
  response &= i2cGNSS.addCfgValset8(UBLOX_CFG_TP_PULSE_LENGTH_DEF, 1); //Define timepulse by length (not ratio)
  response &= i2cGNSS.addCfgValset8(UBLOX_CFG_TP_POL_TP1, settings.externalPulsePolarity); //0 = falling, 1 = raising edge

  // While the module is _locking_ to GNSS time, turn off pulse
  response &= i2cGNSS.addCfgValset32(UBLOX_CFG_TP_PERIOD_TP1, 1000000); //Set the period between pulses in us
  response &= i2cGNSS.addCfgValset32(UBLOX_CFG_TP_LEN_TP1, 0); //Set the pulse length in us

  // When the module is _locked_ to GNSS time, make it generate 1kHz
  response &= i2cGNSS.addCfgValset32(UBLOX_CFG_TP_PERIOD_LOCK_TP1, settings.externalPulseTimeBetweenPulse_us); //Set the period between pulses is us
  response &= i2cGNSS.sendCfgValset32(UBLOX_CFG_TP_LEN_LOCK_TP1, settings.externalPulseLength_us); //Set the pulse length in us

  if (response == false)
    Serial.println("beginExternalTriggers config failed");

  if (settings.enableExternalHardwareEventLogging == true)
    i2cGNSS.setAutoTIMTM2callback(&eventTriggerReceived); //Enable automatic TIM TM2 messages with callback to eventTriggerReceived
  else
    i2cGNSS.setAutoTIMTM2callback(NULL);

  return (response);
}

void beginIdleTasks()
{
  if (settings.enablePrintIdleTime == true)
  {
    char taskName[32];

    for (int index = 0; index < MAX_CPU_CORES; index++)
    {
      sprintf(taskName, "IdleTask%d", index);
      if (idleTaskHandle[index] == NULL)
        xTaskCreatePinnedToCore(
          idleTask,
          taskName, //Just for humans
          2000, //Stack Size
          NULL, //Task input parameter
          0, // Priority, with 3 (configMAX_PRIORITIES - 1) being the highest, and 0 being the lowest
          &idleTaskHandle[index], //Task handle
          index); //Core where task should run, 0=core, 1=Arduino
    }
  }
}

void beginI2C()
{
  Wire.begin(); //Start I2C on core 1
  //Wire.setClock(400000);

  //begin/end wire transmission to see if bus is responding correctly
  //All good: 0ms, response 2
  //SDA/SCL shorted: 1000ms timeout, response 5
  //SCL/VCC shorted: 14ms, response 5
  //SCL/GND shorted: 1000ms, response 5
  //SDA/VCC shorted: 1000ms, reponse 5
  //SDA/GND shorted: 14ms, response 5
  Wire.beginTransmission(0x15); //Dummy address
  int endValue = Wire.endTransmission();
  if (endValue == 2)
    online.i2c = true;
  else
    Serial.println("Error: I2C Bus Not Responding");
}

//Depending on radio selection, begin hardware
void radioStart()
{
#ifdef COMPILE_ESPNOW
  if (settings.radioType == RADIO_EXTERNAL)
  {
    espnowStop();

    //Nothing to start. UART2 of ZED is connected to external Radio port and is configured at configureUbloxModule()
  }
  else if (settings.radioType == RADIO_ESPNOW)
  {
    espnowStart();
  }
#endif
}

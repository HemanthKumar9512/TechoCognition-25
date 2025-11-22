#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "Electro hub";
const char* password = "1234567890";

// WebSocket server on port 81
WebSocketsServer webSocket = WebSocketsServer(81);

// Sensor Pins
#define FLAME_SENSOR 13
#define MQ2_SENSOR 34
#define ONE_WIRE_BUS 4

// LED Pins
#define RED_LED 32
#define GREEN_LED 25
#define BUZZER 26

// Global variables
String jsonData;
int clientCount = 0;
unsigned long lastDataSend = 0;

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(RED_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(FLAME_SENSOR, INPUT);
  
  // Startup sequence
  startupSequence();
  
  // Connect to WiFi
  connectWiFi();
  
  // Start WebSocket server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  
  Serial.println("🚀 AEGIS-SHIELD WebSocket Ready");
  Serial.print("📡 Connect to: ws://");
  Serial.print(WiFi.localIP());
  Serial.println(":81");
}

void startupSequence() {
  digitalWrite(RED_LED, HIGH);
  digitalWrite(GREEN_LED, HIGH);
  digitalWrite(BUZZER, HIGH);
  delay(500);
  digitalWrite(RED_LED, LOW);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(BUZZER, LOW);
}

void connectWiFi() {
  Serial.print("📶 Connecting to ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
    digitalWrite(GREEN_LED, !digitalRead(GREEN_LED)); // Blink during connection
  }
  
  Serial.println("\n✅ WiFi Connected!");
  Serial.print("📡 IP: ");
  Serial.println(WiFi.localIP());
  digitalWrite(GREEN_LED, HIGH);
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected\n", num);
      clientCount--;
      break;
    case WStype_CONNECTED:
      {
        IPAddress ip = webSocket.remoteIP(num);
        Serial.printf("[%u] Connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
        clientCount++;
        webSocket.sendTXT(num, "{\"status\":\"connected\"}");
      }
      break;
    case WStype_TEXT:
      handleWebSocketMessage(num, (char*)payload);
      break;
  }
}

void handleWebSocketMessage(uint8_t num, char* message) {
  Serial.printf("Received: %s\n", message);
  
  if (strstr(message, "emergency")) {
    triggerEmergency();
    webSocket.sendTXT(num, "{\"action\":\"emergency_activated\"}");
  }
  else if (strstr(message, "sos")) {
    triggerSOS();
    webSocket.sendTXT(num, "{\"action\":\"sos_activated\"}");
  }
}

void loop() {
  webSocket.loop();
  
  // Send sensor data every 2 seconds to all clients
  if (millis() - lastDataSend > 2000 && clientCount > 0) {
    readSensors();
    sendSensorData();
    lastDataSend = millis();
  }
  
  delay(100);
}

void readSensors() {
  // Read actual sensors
  bool flame = !digitalRead(FLAME_SENSOR);
  int gas = analogRead(MQ2_SENSOR);
  
  // Generate simulated data for missing sensors
  int heartRate = 70 + random(-10, 15);
  float temperature = 25.0 + random(-10, 10) / 10.0;
  int posture = random(0, 3);
  bool fallDetected = random(100) < 5; // 5% chance
  
  // Update LEDs based on sensor readings
  if (flame || fallDetected || gas > 2000) {
    digitalWrite(RED_LED, HIGH);
    digitalWrite(GREEN_LED, LOW);
  } else {
    digitalWrite(RED_LED, LOW);
    digitalWrite(GREEN_LED, HIGH);
  }
  
  // Create JSON data
  createSensorJSON(heartRate, temperature, gas, posture, fallDetected, flame);
}

void createSensorJSON(int hr, float temp, int gas, int posture, bool fall, bool flame) {
  StaticJsonDocument<300> doc;
  
  // Basic sensor data
  doc["heartRate"] = hr;
  doc["temperature"] = temp;
  doc["gasLevel"] = gas;
  doc["posture"] = posture;
  doc["fallDetected"] = fall;
  doc["flameDetected"] = flame;
  
  // System info
  doc["status"] = (flame || fall) ? "EMERGENCY" : "NORMAL";
  doc["timestamp"] = millis() / 1000;
  doc["clients"] = clientCount;
  
  // Convert to JSON string
  serializeJson(doc, jsonData);
}

void sendSensorData() {
  if (clientCount > 0) {
    webSocket.broadcastTXT(jsonData);
    
    // Print to serial every 10 seconds
    static unsigned long lastPrint = 0;
    if (millis() - lastPrint > 10000) {
      Serial.println("📤 Sent sensor data to clients");
      lastPrint = millis();
    }
  }
}

void triggerEmergency() {
  Serial.println("🚨 EMERGENCY TRIGGERED");
  
  for(int i = 0; i < 5; i++) {
    digitalWrite(RED_LED, HIGH);
    digitalWrite(BUZZER, HIGH);
    delay(200);
    digitalWrite(RED_LED, LOW);
    digitalWrite(BUZZER, LOW);
    delay(200);
  }
  
  webSocket.broadcastTXT("{\"alert\":\"EMERGENCY_MANUAL_TRIGGER\"}");
}

void triggerSOS() {
  Serial.println("🆘 SOS TRIGGERED");
  
  // SOS pattern: ... --- ...
  for(int i = 0; i < 3; i++) { digitalWrite(BUZZER, HIGH); delay(200); digitalWrite(BUZZER, LOW); delay(200); }
  delay(400);
  for(int i = 0; i < 3; i++) { digitalWrite(BUZZER, HIGH); delay(500); digitalWrite(BUZZER, LOW); delay(200); }
  delay(400);
  for(int i = 0; i < 3; i++) { digitalWrite(BUZZER, HIGH); delay(200); digitalWrite(BUZZER, LOW); delay(200); }
  
  webSocket.broadcastTXT("{\"alert\":\"SOS_SIGNAL_SENT\"}");
}
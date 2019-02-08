//https://github.com/node-opcua/node-opcua/blob/master/documentation/creating_a_client.md


const opcua = require("node-opcua");
const async = require("async");
var mqtt = require('mqtt');

const clientOPC = new opcua.OPCUAClient();

//const opcEndPoint = process.argv[2];
//let opcNodeId = process.argv[3];
//const mqttBroker = process.argv[4];


var config={
    opcEndPoint:"opc.tcp://DESKTOP-BMPPPBP:4334/OPCUA/SimulationServer",
    opcNodeId:"ns=5;s=Counter1",
    mqttBroker:"mqtt://127.0.0.1",
};

config.mqttBroker=process.env.mqtt;
config.opcEndPoint=process.env.opc_end_point;
config.opcNodeId=process.env.opc_node_id;


var topic = getNodeId() + "/" + config.opcNodeId;

console.log("Parameterreinfolge: opcEndPoint, opcNodeId, mqttBroker");
console.log("Beispiel: opc.tcp://DESKTOP-BMPPPBP:4334/OPCUA/SimulationServer  ns=5;s=Counter1 mqtt://127.0.0.1");


console.log("opcEndPoint: " + config.opcEndPoint);
console.log("mqttEndPoint: " + config.mqttBroker);
console.log("topic: " + topic);

if (config.opcEndPoint == undefined || config.nodeId == undefined ||
    config.mqttBroker == undefined) {
    console.log("parameter stimmen nicht");
    process.exit(1);
}

var clientMqtt = mqtt.connect(config.mqttBroker);


let the_session, the_subscription;

async.series([
    function (callback) {
        clientMqtt.on('connect', function () {
            {
                console.log("connect to MQTT Endpoint: " + config.mqttBroker);
                callback(0);
            }
        });
    },

    // step 1 : connect to
    function (callback) {
        clientOPC.connect(config.opcEndPoint, function (err) {
            if (err) {
                console.log(" cannot connect to OPC UA Endpoint :" + config.opcEndPoint);
            } else {
                console.log("connected !");
            }
            callback(err);
        });
    },

    // step 2 : createSession
    function (callback) {
        clientOPC.createSession(function (err, session) {
            if (!err) {
                the_session = session;
            }
            callback(err);
        });
    },

    // step 4' : read a variable with read
    function (callback) {
        the_subscription = new opcua.ClientSubscription(the_session, {
            //https://www.prosysopc.com/blog/opc-ua-sessions-subscriptions-and-timeouts/
            requestedPublishingInterval: 500, //intervall der abfrage
            requestedLifetimeCount: 10, //sendet request an den server damit 
            requestedMaxKeepAliveCount: 2,
            maxNotificationsPerPublish: 10,
            publishingEnabled: true,
            priority: 10
        });

        the_subscription.on("started", function () {
            console.log("subscriptionId=", the_subscription.subscriptionId);
        }).on("keepalive", function () {
            console.log("keepalive");
        }).on("terminated", function () {
            console.log("terminated");
        });

        //monitoring
        const monitoredItem = the_subscription.monitor({
            nodeId: opcua.resolveNodeId(nodeId),   //welche NodeId 
            attributeId: opcua.AttributeIds.Value //welches Attribute von der NodeId
        },
            {
                samplingInterval: 100,
                discardOldest: true,
                queueSize: 10
            },
            opcua.read_service.TimestampsToReturn.Both
        );
        console.log("-------------------------------------");

        monitoredItem.on("changed", function (dataValue) {
            console.log("wert: " + dataValue.value.value);
            wert = String(dataValue.value.value);
            var o={"name":nodeId,
                    "value":wert,};
            
            clientMqtt.publish(topic,JSON.stringify(o));
        });
    },

    // close session
    function (callback) {
        the_session.close(function (err) {
            if (err) {
                console.log("closing session failed ?");
            }
            callback();
        });
    }

    ],
    function (err) {
    if (err) {
            console.log(" failure ", err);
        } else {
            console.log("done!");
        }
        //client.disconnect(function(){});
    });


function getNodeId()
{
    return os.hostname().replace(/\./g, '/');
}
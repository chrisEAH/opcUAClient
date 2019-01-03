//https://github.com/node-opcua/node-opcua/blob/master/documentation/creating_a_client.md
/*node client.js --opcEndPoint opc.tcp://DESKTOP-BMPPPBP:4334/OPCUA/SimulationServer --mqttEndPoint 127.0.0.1 --nodeId ns=5;s=Counter1  --publish Counter1
*/

const opcua = require("node-opcua");
const async = require("async");
const args = require('yargs').argv;
var mqtt = require('mqtt');

const clientOPC = new opcua.OPCUAClient();

/*
const opcEndPoint = args.opcEndPoint;
let nodeId = args.nodeId;
const mqttEndPoint = args.mqttEndPoint;
let publish = args.publish;
*/

const opcEndPoint=process.argv[2];
let nodeId = process.argv[3];
const mqttEndPoint = process.argv[4];
let publish = process.argv[5];

console.log("Parameterreinfolge: opcEndPoint, mqttEndPoint, nodeId, publish");
console.log("Beispiel: opc.tcp://DESKTOP-BMPPPBP:4334/OPCUA/SimulationServer  ns=5;s=Counter1 mqtt://127.0.0.1 Counter1");


console.log("opcEndPoint: "+opcEndPoint);
console.log("mqttEndPoint: "+mqttEndPoint);
console.log("nodeId: "+nodeId);
console.log("publish: "+publish);

if(opcEndPoint == undefined || nodeId==undefined ||
    mqttEndPoint == undefined || publish==undefined)
{
    console.log("parameter stimmen nicht");
    process.exit(1);
}

var clientMqtt  = mqtt.connect(mqttEndPoint);


let the_session, the_subscription;

async.series([
    /*function(callback){
        clientMqtt.on('connect', function () {
        {
            console.log("connect to MQTT Endpoint: "+ mqttEndPoint );
            callback(0);
        }
        });
    },*/

    // step 1 : connect to
    function(callback)  {
        clientOPC.connect(opcEndPoint, function (err) {
            if(err) {
                console.log(" cannot connect to OPC UA Endpoint :"+ opcEndPoint );
            } else {
                console.log("connected !");
            }
            callback(err);
        });
    },

    // step 2 : createSession
    function(callback) {
        clientOPC.createSession( function(err, session) {
            if(!err) {
                the_session = session;
            }
            callback(err);
        });
    },

    // step 4' : read a variable with read
    function(callback) {
        the_subscription=new opcua.ClientSubscription(the_session, {
            //https://www.prosysopc.com/blog/opc-ua-sessions-subscriptions-and-timeouts/
            requestedPublishingInterval: 500, //intervall der abfrage
            requestedLifetimeCount: 10, //sendet request an den server damit 
            requestedMaxKeepAliveCount: 2,
            maxNotificationsPerPublish: 10,
            publishingEnabled: true,
            priority: 10
        });
        
        the_subscription.on("started", function() {
            console.log("subscriptionId=",the_subscription.subscriptionId);
        }).on("keepalive", function() {
            console.log("keepalive");
        }).on("terminated", function() {
           console.log("terminated");
        });

        //monitoring
        const monitoredItem  = the_subscription.monitor({
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
        
        monitoredItem.on("changed", function(dataValue) {
            console.log("wert: " +dataValue.value.value);
           wert=String(dataValue.value.value);
            clientMqtt.publish(publish, wert);
        });
    },

    // close session
    function(callback) {
        the_session.close( function(err) {
            if(err) {
                console.log("closing session failed ?");
            }
            callback();
        });
    }

],
function(err) {
    if (err) {
        console.log(" failure ",err);
    } else {
        console.log("done!");
    }
    //client.disconnect(function(){});
}) ;


function mqttPublish()
{

}
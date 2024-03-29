console.log("\nServer Launched " + new Date().toString() + " v0.0.1\n");

process.on('uncaughtException', function (exception) {
  console.log(exception);
});

require('dotenv').config();
const express = require('express');
const { gql, ApolloServer } = require('apollo-server-express');
const http = require('http');
const https = require('https');
const fs = require('fs');

// Configure Express Server
const HTTP_PORT = process.env.PORT || 80;
const SSL_PORT = process.env.SSL_PORT || 443;
const app = express();

// Setup Database Access
const MongoClient = require('./Clients/MongoClient.js');
const RedisClient = require('./Clients/RedisClient.js');

// Initialize Firebase Admin API
const admin = require('firebase-admin');
const rp = require('request-promise');

console.log("Setting Up Firebase SDK...");

try{
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://hot-minute.firebaseio.com"
});
}
catch(e){
console.log(e);
}

console.log("Creating Test Credentials...");

admin.auth().createCustomToken('Uwt4O9dTvjeRN9Zq0J2AtsC9HGG2')
  .then(async token => {
    const { idToken } = await rp({
      uri: `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken?key=AIzaSyCwZIztMG32Y5A_V3y28VHbOMZzi7MWau0`,
      method: 'POST',
      body: {
        token,
        returnSecureToken: true
      },
      json: true
    });
    console.log("Test idToken: ", idToken);
  })
  .catch(error => {
    console.log("Couldn't create test token!", error)
  });

admin.auth().getUser

// Setup GraphQL Server
const { typeDefs, resolvers } = require('./Schemas/GraphQLSchema');
const { RedisPubSub } = require('graphql-redis-subscriptions');

var redisClient = require('redis-connection')();
var redisSub = require('redis-connection')('subscriber');

const pubsub = new RedisPubSub({
  publisher: redisClient,
  subscriber: redisSub,
});

const apolloServer = new ApolloServer(
  {
    typeDefs,
    resolvers,
    subscriptions: {
      onConnect: (params, socket) => {
        console.log("Subscription Socket Connected");
        return {
          pubsub
        }
      },
      onDisconnect: () => {
        console.log("Subscription Socket Disconnected");
      }
    },
    context: async ({ req, connection }) => {
      if (connection) {
        return Object.assign(connection.context, { pubsub });
      }
      const idToken = req.headers.authorization || '';
      if (idToken && idToken.length > 0) {
        try {
          let decodedToken = await admin.auth().verifyIdToken(idToken);
          let uid = decodedToken.uid;
          return { authorized: true, uid, pubsub };
        }
        catch (error) {
          console.log("Could not verify token", error);
          return { authorized: false, pubsub };
        }
      }
      else {
        return { pubsub }
      }
    }
  }
);
apolloServer.applyMiddleware({ app });

app.get('/', (req, res) => {
  res.send('HotMinuteAPI v0.0.1');
})

// Start Servers

const key = fs.readFileSync('./ssl/server.key');
const cert = fs.readFileSync('./ssl/server.cert');

const serverHTTPS = https.createServer({key, cert}, app);
const serverHTTP = http.createServer(app);

serverHTTPS.listen({ port: SSL_PORT }, () =>
  console.log(`🚀 GraphQL Server (HTTPS) ready at http://localhost:${SSL_PORT}${apolloServer.graphqlPath}`)
);

serverHTTP.listen(HTTP_PORT, () => {
  console.log(`🚀 GraphQL Server (HTTP) ready at http://localhost:${HTTP_PORT}${apolloServer.graphqlPath}`);
});

apolloServer.installSubscriptionHandlers(serverHTTP);
apolloServer.installSubscriptionHandlers(serverHTTPS)


// Start Matchmaking Socket Server

// const io = new WebSocketServer({
//   httpServer: [serverHTTP, serverHTTPS],
// })

// const clients = {};
// const users = {};

// let usersNeedingMatches = [];

// const getUniqueID = () => {
//   const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
//   return s4() + s4() + '-' + s4();
// };

// io.on('request', request => {
//   var userId = getUniqueID();
//   console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');
//   const connection = request.accept(null, request.origin);
//   clients[userId] = connection;
//   connection.on('message', messageRaw => {
//     var message = JSON.parse(messageRaw.utf8Data);
//     switch(message.type){
//       case 'auth': {
//         console.log(`Client ${userId} is ${message.body}`);
//         users[message.body] = userId;
//         break;
//       }
//       case 'debug': {
//         console.log(message.body);
//         connection.send(JSON.stringify({
//           type: 'debug',
//           body: 'Success'
//         }));
//         break;
//       }
//       case 'joinqueue': {
//         console.log(`User with socketId ${userId} is joining queue with uid ${message.body.uid}`)
//         var requestingUser = message.body;
//         if(usersNeedingMatches.find(e => e.uid == requestingUser.uid)){
//           return;
//         }
//         if (usersNeedingMatches.length > 0) {
//           let nextUser = usersNeedingMatches.pop();
//           let requestingUserToken = AgoraClient.generateRTCToken(requestingUser.uid, `${requestingUser.uid}_${nextUser.uid}`)
//           let nextUserToken = AgoraClient.generateRTCToken(nextUser.uid, `${requestingUser.uid}_${nextUser.uid}`)

// //           connection.send(JSON.stringify({type: 'matchfound', body:{token: requestingUserToken, roomId: `${requestingUser.uid}_${nextUser.uid}`}}));
// //           connection.send(JSON.stringify({type: 'debug', body: 'Match Found!'}));

//           clients[users[nextUser.uid]].send(JSON.stringify({type: 'matchfound', body:{token: nextUserToken, roomId: `${requestingUser.uid}_${nextUser.uid}`}}))
//           clients[users[nextUser.uid]].send(JSON.stringify({type: 'debug', body: 'Match Found!'}));

//           usersNeedingMatches = usersNeedingMatches.filter(e => e.uid != requestingUser.uid);
//           usersNeedingMatches = usersNeedingMatches.filter(e => e.uid != nextUser.uid);
//         }
//         else {
//           usersNeedingMatches.push({uid: requestingUser.uid});
//         }
//         break;
//       }

//       case 'leavequeue': {
//         requestingUser = message.body;
//         usersNeedingMatches = usersNeedingMatches.filter(e => e.uid != requestingUser.uid);
//         break;
//       }
//     }
//   })

//   connection.on('close', connection => {
//     console.log((new Date()) + " Peer " + userId + " disconnected.");
//     delete clients[userId];
//   })
//   console.log('connected: ' + userId + ' in ' + Object.getOwnPropertyNames(clients))
// })

// // add authentication to socket
// // matchmaker.use((socket, next) => {
// //   let idToken = socket.handshake.query.token;
// //   // BYPASS AUTHENTICATION TODO: REMOVE THIS LINE
// //   return next();
// //   admin.auth().verifyIdToken(idToken)
// //     .then(function (decodedToken) {
// //       let uid = decodedToken.uid;
// //       activeUsers.push({uid, socketId: socket.id});
// //       return next();
// //     }).catch(function (error) {
// //       return next(Error('authentication error'));
// //     });
// // });

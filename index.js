const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const webpush = require('web-push');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const serviceAccount = require('./tforms-1ea7c-firebase-adminsdk-93xcb-5d1d611f87.json');

const app = express();
const jsonParser = bodyParser.json();
let PORT = process.env.PORT || 8000

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const formQuestions = db.collection('form-questions');

const publicKey = 'BPfuGqkKjhZ6KGBzJaJUKO1XkxjGQgAmYA3WZqIigu8xq129o542EoiQJuGV7gEykSTAVmUOE_aDklOU8FuiaOo';
const privateKey = 'sMEY3npHhefqfClma_oW-A5EEYIdQNYZMmVhk68WJjw';
webpush.setVapidDetails('mailto:example@domain.org', publicKey, privateKey);

/** Firebase Functions */

async function getForm() {
    const forms = await formQuestions.where('recipients', 'array-contains', 'sigid.iqbal123@gmail.com').get();
    if (forms.empty) {
        console.log('No matching documents.');
        return;
    }
      
    forms.forEach(doc => {
        console.log(doc.id, '=>', doc.data());
    });
}

async function addForm(form) {
    form.createdAt = new Date();
    const res = await formQuestions.add(form);
    const formRef = formQuestions.doc(res.id);
    const res2 = await formRef.update({docId: res.id})
    console.log(res2);
}

async function getToken(email) {
    let tokens = [];
    const account = db.collection('accounts');
    const users = await account.where('email', '==', email).get();
    if (users.empty) {
        console.log('No matching documents.');
        return;
    }

    await users.forEach(u => {
        tokens.push(u.data().token);
        //sendNotification(u.data().token);
    })
    
    return tokens[0];
}

function sendNotification(email, formTitle, formAuthor) {

  getToken(email).then(token => {
    if (token == null) return;
    sub = JSON.parse(token);

    let payload = notifObj;
    payload.notification.title = formTitle;
    payload.notification.body = `New form for you to fill from ${formAuthor}`;

    webpush.sendNotification(sub, JSON.stringify(payload)).catch(console.log);
    return;
    /*
    // Send a message to the device corresponding to the provided registration token.
    getMessaging().send(message)
      .then((response) => {
        // Response is a message ID string.
        console.log('Successfully sent message:', response);
      })
      .catch((error) => {
        console.log('Error sending message:', error);
      });
      */
  })
}


/** Express Endpoints */

app.use(cors());

app.get('/', (req, res) => {
  res.send('Hello World!');
})

app.post('/send-form', jsonParser, (req,  res) => {
  const form = req.body;
  //console.log(form);
  addForm(form);
  for (let email of form.recipients) {
    sendNotification(email, form.formTitle, form.authorName);
  }
  res.send();
  return;
})

app.listen(PORT, () => {
  console.log(`Server running at localhost:${PORT}`);
})

const notifObj = {
  "notification": {
      "title": "",
      "body": "",
      "icon": "https://seeklogo.com/images/T/tensorflow-logo-02FCED4F98-seeklogo.com.png",
      "data": {
        "onActionClick": {
          "default": {"operation": "navigateLastFocusedOrOpen"}
        }
      },
      "silent": false
  }
}
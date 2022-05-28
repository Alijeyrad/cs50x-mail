document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#submitButton').addEventListener('click', (event) => sendEmail(event));
  document.querySelector('#compose').addEventListener('click', () => compose_email());
  
  // By default, load the inbox
  load_mailbox('inbox');
});

const compose_email = async function(id = -1) {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#single-mail-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  
  // if reply mode > find email > fill input fields
  let response;
  let subject = '';
  let timestamp = '';
  let sender = '';
  let body = '';
  if (id !== -1) {
    const x = await fetch(`/emails/${id}`);
    response = await x.json();
    subject = response.subject;
    timestamp = response.timestamp;
    sender = response.sender;
    body = response.body;
  }

  // Clear out composition fields or fill them in reply mode
  document.querySelector('#compose-recipients').value = sender;

  if (subject) {
    document.querySelector('#compose-subject').value = subject.startsWith('Re: ') ? subject : `Re: ${subject}`;
  } else {
    document.querySelector('#compose-subject').value = '';
  }

  if (timestamp) {
    document.querySelector('#compose-body').value = `<On ${timestamp} ${sender} wrote: ${body}>`;
  } else {
    document.querySelector('#compose-body').value = body;
  }
}

const load_mailbox = async function(mailbox, sentSuccess = '') {

  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#single-mail-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  
  // Show the mailbox name
  const header = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;
  
  // "template" is the final string loaded inside #emails-view
  let template = header;

  // get emails form api
  const emails = await fetchMail(mailbox);

  switch (sentSuccess) {
    case 'success':
      template += '<h4 class="text-success">Email sent successfully</h4>';
      break;
    case 'error':
      template += '<h4 class="text-danger">Email not sent! try again</h4>';
      break;
    default:
      template += '';
      break;
  }

  let count = 0;
  emails.forEach(email => {
    template += makeEmailTemplate(email);
    count++;
  })

  if (count === 0) {
    template += `
      <div class="noEmails border rounded container mb-2 text-center bg-light shadow-sm">
          <strong>
              No Emails here
          </strong>
      </div>
    `
  }
  
  const emailsView = document.querySelector('#emails-view')
  emailsView.innerHTML = template;
}

const fetchMail = async function (mailbox) {
  const x = await fetch(`emails/${mailbox}`);
  const response = await x.json();
  return response;
}

const sendEmail = async function(event) {
  event.preventDefault();
  
  // get values from input fields
  const body = event.target.parentElement[3].value
  const subject = event.target.parentElement[2].value
  const recipients = event.target.parentElement[1].value

  // make the api call
  const x = await fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      subject: subject,
      recipients: recipients,
      body: body
    })
  });
  const response = await x.json();

  // decide if email was sent successfully or not
  // based on this show message in sent mailbox
  let success;

  if (response.message) {
    success = 'success';
  } else if (response.error) {
    success = 'error';
  }

  // show sent mailbox
  load_mailbox('sent', success)
}

const fetchSingleMail = async function(id) {
  const x = await fetch(`emails/${id}`);
  const response = await x.json();
  return response;
}

const showEmail = async function(id) {
  // get the email from api
  const mail = await fetchSingleMail(id);
  console.log(mail);
  // hide and show related views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#single-mail-view').style.display = 'block';
  
  // create template
  let fullEmail = createFullEmailTemplate(mail);

  // mark email as read
  makeEmailRaed(id)

  // load the mail in "single-mail-view"
  document.querySelector('#single-mail-view').innerHTML = fullEmail;
}

const makeEmailRaed = function(id) {

  fetch(`/emails/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      read: true
    })
  })
}

const reply = function(id) {
  compose_email(id);
}

const markAsUnread = async function(id) {

  const x = fetch(`/emails/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      read: false
    })
  })

  load_mailbox('inbox');
  load_mailbox('inbox');
}

const makeArchived = async function(id, archived) {
  const x = fetch(`/emails/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: !archived
    })
  })

  load_mailbox('archive');
  load_mailbox('archive');
}

const createFullEmailTemplate = function(mail) {
  const fullEmail =  `
    <div class="fullEmail d-flex flex-column">
      <h4>${mail.subject !== '' ? mail.subject : 'no subject'}</h4>
      <p class="border p-2 rounded bg-light"><strong>from: </strong>"${mail.sender}"</p>
      <p class="border p-2 rounded bg-light"><strong>to: </strong>${mail.recipients.map((rec)=>(' "' + rec + '"'))}</p>
      <div class="border shadow-sm p-4 rounded bg-light">${mail.body !== '' ? mail.body : 'no body'}
        <div>
          <button onclick="reply(${mail.id})" class="btn btn-outline-dark btn-sm mt-4">Reply</button>
          <button onclick="markAsUnread(${mail.id})" id="markAsUnread" class="btn btn-outline-dark btn-sm mt-4">Mark as unread</button>
          <button onclick="makeArchived(${mail.id}, ${mail.archived})" id="markArchived" class="btn btn-outline-dark btn-sm mt-4">${mail.archived? 'Unarchive' : 'Archive'}</button>
        </div>
      </div>
    </div>
  `;

  return fullEmail;
}

const makeEmailTemplate = function (email) {
  const emailTemplate = `
    <div onclick="showEmail(${email.id})" class="singleEmail border container mb-2 d-flex flex-row justify-content-between align-items-center"
      style= "background-color:${email.read ? '#e6e6e6' : '#fff'}"
    >
      <strong id="emailSender">${email.sender}</strong>
      <div id="emailBody">
        <strong>${email.subject !== '' ? email.subject : 'no subject'}:</strong>
        <span>${email.body !== '' ? email.body : 'no body'}</span>
      </div>
        <small id="emailTimeStamp" class="text-muted" >${email.timestamp}</small>
    </div>
  `
  return emailTemplate;
}
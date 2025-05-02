document.addEventListener('DOMContentLoaded', async () => {
  const chatForm = document.getElementById('comment-form');
  const chatInput = document.getElementById('comment-input');
  const chatSection = document.getElementById('comment-section');
  const userCountDisplay = document.getElementById('user-count');
  const typingIndicator = document.createElement('div');
  typingIndicator.id = 'typing-indicator';
  typingIndicator.textContent = '';
  chatSection.parentNode.insertBefore(typingIndicator, chatSection.nextSibling);

  const firebaseConfig = {
    apiKey: "AIzaSyBUKFgaCvyGsP8lGJzshhzJAhY23FKmUKI",
    authDomain: "chat-room-c8efa.firebaseapp.com",
    projectId: "chat-room-c8efa",
    storageBucket: "chat-room-c8efa.appspot.com",
    messagingSenderId: "393069733561",
    appId: "1:393069733561:web:f30167e3876fcdf2fe1d68"
  };

  const app = firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
  let usernameCounter = parseInt(localStorage.getItem('usernameCounter')) || 100;

  if (!currentUser) {
    currentUser = {
      username: `Guest${usernameCounter++}`,
      avatar: getRandomAvatar()
    };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('usernameCounter', usernameCounter);
  }

  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `${currentUser.username}_${Date.now()}`;
    localStorage.setItem('sessionId', sessionId);
  }

  function getRandomAvatar() {
    const rand = Math.random().toString(36).substring(7);
    return `https://robohash.org/${rand}?set=set1&size=50x50`;
  }

  async function addOrUpdateUser() {
    const userRef = db.collection('usersOnline').doc(sessionId);
    await userRef.set({
      username: currentUser.username,
      avatar: currentUser.avatar,
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  async function removeUserFromOnline() {
    const userRef = db.collection('usersOnline').doc(sessionId);
    await userRef.delete();
  }

  function listenForUserCount() {
    db.collection('usersOnline').onSnapshot(snapshot => {
      const now = Date.now();
      const activeUsers = snapshot.docs.filter(doc => {
        const lastActive = doc.data().lastActive?.toDate();
        return lastActive && (now - lastActive.getTime() < 2 * 60 * 1000);
      });
      userCountDisplay.textContent = `${activeUsers.length} `;
    });
  }

  function playNotificationSound() {
    const audio = new Audio('https://notificationsounds.com/storage/sounds/file-sounds-1152-pristine.mp3');
    audio.play().catch(err => {
      console.log("Sound playback prevented until user interacts:", err);
    });
  }

  function createMessageElement(msg, id) {
    const wrapper = document.createElement('div');
    wrapper.className = 'chat-message';
    wrapper.id = id;

    const avatar = document.createElement('img');
    avatar.src = msg.avatar;
    avatar.className = 'avatar';

    const content = document.createElement('div');
    content.className = 'message-content';

    const header = document.createElement('div');
    header.className = 'message-header';

    const username = document.createElement('strong');
    username.className = 'username';
    username.textContent = msg.username;

    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = msg.timestamp
      ? msg.timestamp.toDate().toLocaleTimeString()
      : '';

    header.append(username, timestamp);

    const text = document.createElement('p');
    text.className = 'message-text';
    text.textContent = `${msg.username}: ${msg.text}`;

    const replyBtn = document.createElement('button');
    replyBtn.textContent = 'Reply';
    replyBtn.onclick = () => handleReply(id);

    content.append(header, text, replyBtn);
    wrapper.append(avatar, content);
    return wrapper;
  }

  function loadChatMessages() {
    db.collection('chatroom').orderBy('timestamp').onSnapshot(snap => {
      chatSection.innerHTML = '';
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          playNotificationSound();
        }
      });
      snap.forEach(docSnap => {
        chatSection.append(createMessageElement(docSnap.data(), docSnap.id));
      });
      chatSection.scrollTop = chatSection.scrollHeight;
    });
  }

  chatForm.addEventListener('submit', async e => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    await db.collection('chatroom').add({
      username: currentUser.username,
      avatar: currentUser.avatar,
      text,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    chatInput.value = '';
    db.collection('typingStatus').doc(sessionId).delete();
  });

  chatInput.addEventListener('input', () => {
    db.collection('typingStatus').doc(sessionId).set({
      username: currentUser.username,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  });

  db.collection('typingStatus').onSnapshot(snapshot => {
    const now = Date.now();
    const activeTypers = snapshot.docs.filter(doc => {
      const data = doc.data();
      const lastTyped = data.timestamp?.toDate();
      return lastTyped && (now - lastTyped.getTime() < 5000) && data.username !== currentUser.username;
    });

    if (activeTypers.length > 0) {
      typingIndicator.textContent = `${activeTypers.map(u => u.data().username).join(', ')} is typing...`;
    } else {
      typingIndicator.textContent = '';
    }
  });

  await addOrUpdateUser();
  listenForUserCount();
  window.addEventListener('beforeunload', removeUserFromOnline);
  loadChatMessages();

  // Ensure sound can be played after user interaction
  document.body.addEventListener('click', () => {
    const audio = new Audio('https://notificationsounds.com/storage/sounds/file-sounds-1152-pristine.mp3');
    audio.volume = 0; // inaudible sound to unlock audio permissions
    audio.play().catch(() => {});
  });
});

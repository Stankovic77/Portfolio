document.addEventListener('DOMContentLoaded', () => {
    const commentForm = document.getElementById('comment-form');
    const commentInput = document.getElementById('comment-input');
    const commentSection = document.getElementById('comment-section');
    const clearButton = document.getElementById('clear-comments');

    // Firebase setup
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

    // If no user is saved in localStorage, create a new anonymous user
    if (!currentUser) {
        currentUser = {
            username: `Anonymous${Date.now()}`,
            avatar: getRandomAvatar(),
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }

    function getRandomAvatar() {
        const randomText = Math.random().toString(36).substring(7);
        return `https://robohash.org/${randomText}?set=set1&size=50x50`;
    }

    // Create a comment element
    function createCommentElement(comment) {
        const commentDiv = document.createElement('div');
        commentDiv.classList.add('comment');

        const header = document.createElement('div');
        header.classList.add('comment-header');

        const avatar = document.createElement('img');
        avatar.src = comment.avatar;
        avatar.alt = 'Avatar';
        avatar.classList.add('avatar');

        const usernameSpan = document.createElement('span');
        usernameSpan.classList.add('username');
        usernameSpan.textContent = comment.username;

        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('timestamp');
        timestampSpan.textContent = new Date(comment.timestamp.seconds * 1000).toLocaleString();

        header.appendChild(avatar);
        header.appendChild(usernameSpan);
        header.appendChild(timestampSpan);

        const content = document.createElement('p');
        content.textContent = comment.text;

        const actions = document.createElement('div');
        actions.classList.add('actions');

        commentDiv.appendChild(header);
        commentDiv.appendChild(content);
        commentDiv.appendChild(actions);

        return commentDiv;
    }

    // Render comments from Firebase
    function renderComments() {
        commentSection.innerHTML = ''; // Clear the comments section first

        db.collection('comments')
            .orderBy('timestamp', 'desc')
            .onSnapshot((snapshot) => {
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const commentElement = createCommentElement(data);
                    commentSection.appendChild(commentElement);
                });
            });
    }

    // Add comment to Firebase
    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = commentInput.value.trim();
        if (text !== '') {
            await db.collection('comments').add({
                username: currentUser.username,
                avatar: currentUser.avatar,
                text: text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });

            commentInput.value = ''; // Clear the input after posting
        }
    });

    // Clear comments (delete all from Firebase)
    clearButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete all comments?')) {
            const commentsSnapshot = await db.collection('comments').get();
            commentsSnapshot.forEach(async (doc) => {
                await db.collection('comments').doc(doc.id).delete();
            });
            renderComments(); // Reload comments after deletion
        }
    });

    // Initial render of comments
    renderComments();
});

import { byNewest, hashPassword, uid } from "./utils.js";
import { createSeedState } from "./seed.js";

const DATA_KEY = "connect-social-data-v1";
const SESSION_KEY = "connect-social-session-v1";

let state = null;
const listeners = new Set();

function persistData() {
  if (!state) return;
  const { session, drafts, ...rest } = state;
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(rest));
  } catch (error) {
    console.warn("Connect could not persist data. Storage may be full.", error);
  }
}

function persistSession() {
  if (!state) return;
  const payload = state.session ? JSON.stringify(state.session) : "";
  try {
    if (state.session?.rememberMe) {
      localStorage.setItem(SESSION_KEY, payload);
      sessionStorage.removeItem(SESSION_KEY);
    } else if (state.session) {
      sessionStorage.setItem(SESSION_KEY, payload);
      localStorage.removeItem(SESSION_KEY);
    } else {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch (error) {
    console.warn("Connect could not persist the session.", error);
  }
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function emit(meta = {}) {
  persistData();
  persistSession();
  const snapshot = getState();
  listeners.forEach((listener) => listener(snapshot, meta));
}

function mutate(updater, meta = {}) {
  state = updater(state);
  emit(meta);
}

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function currentUser() {
  if (!state?.session) return null;
  return state.users.find((user) => user.id === state.session.userId) || null;
}

export function getUser(id) {
  return state.users.find((user) => user.id === id) || null;
}

export function getPost(id) {
  return state.posts.find((post) => post.id === id) || null;
}

export function getSettings(userId = currentUser()?.id) {
  const defaults = { theme: "light", hideChat: false, hideAd: false, compactMode: false };
  return { ...defaults, ...(state.settings[userId] || {}) };
}

export async function initStore() {
  let saved = null;
  try {
    const raw = localStorage.getItem(DATA_KEY);
    saved = raw ? JSON.parse(raw) : null;
  } catch {
    saved = null;
  }

  if (saved?.users?.length && Array.isArray(saved.posts)) {
    const seed = await createSeedState();
    state = {
      ...seed,
      ...saved,
      drafts: { post: "", feeling: null, image: null },
      session: null,
    };
  } else {
    state = await createSeedState();
    persistData();
  }

  const session = loadSession();
  if (session?.userId && state.users.some((user) => user.id === session.userId)) {
    state.session = session;
  } else {
    state.session = null;
  }
}

function notify({ userId, type, fromId, postId, text }) {
  if (!userId || userId === fromId) return;
  state.notifications.unshift({
    id: uid("n"),
    userId,
    type,
    fromId,
    postId: postId || null,
    text,
    createdAt: Date.now(),
    read: false,
  });
}

export async function signup({ name, email, password, rememberMe }) {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  if (trimmedName.length < 2) throw new Error("Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) throw new Error("Enter a valid email address.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  if (state.users.some((user) => user.email === trimmedEmail)) {
    throw new Error("An account with that email already exists.");
  }
  const user = {
    id: uid("u"),
    name: trimmedName,
    email: trimmedEmail,
    passwordHash: await hashPassword(password),
    avatar: "/facebook/profile-pic.png",
    cover: "/facebook/cover.png",
    bio: "New on Connect. Say hello!",
    location: "",
    workplace: "",
    education: "",
    joinedAt: Date.now(),
    friendIds: [],
    requestIds: [],
  };
  mutate((prev) => ({
    ...prev,
    users: [user, ...prev.users],
    settings: { ...prev.settings, [user.id]: getSettings(user.id) },
    session: { userId: user.id, rememberMe: Boolean(rememberMe) },
  }), { reason: "signup" });
  return user;
}

export async function login({ email, password, rememberMe }) {
  const trimmedEmail = email.trim().toLowerCase();
  const user = state.users.find((item) => item.email === trimmedEmail);
  if (!user) throw new Error("We could not find an account with that email.");
  const incoming = await hashPassword(password);
  if (incoming !== user.passwordHash) throw new Error("That password does not match.");
  mutate((prev) => ({
    ...prev,
    session: { userId: user.id, rememberMe: Boolean(rememberMe) },
  }), { reason: "login" });
  return user;
}

export function logout() {
  mutate((prev) => ({ ...prev, session: null, drafts: { post: "", feeling: null, image: null } }), { reason: "logout" });
}

export function updateProfile(fields) {
  const me = currentUser();
  if (!me) return;
  mutate((prev) => ({
    ...prev,
    users: prev.users.map((user) => (user.id === me.id ? { ...user, ...fields } : user)),
  }), { reason: "profile" });
}

export function updateSettings(partial) {
  const me = currentUser();
  if (!me) return;
  mutate((prev) => ({
    ...prev,
    settings: { ...prev.settings, [me.id]: { ...getSettings(me.id), ...partial } },
  }), { reason: "settings" });
}

export function setDraft(partial) {
  state = { ...state, drafts: { ...state.drafts, ...partial } };
}

export function createPost({ text, image, feeling, audience = "public" }) {
  const me = currentUser();
  if (!me) throw new Error("You need to log in first.");
  const content = (text || "").trim();
  if (!content && !image && !feeling) throw new Error("Write something or add a photo before posting.");
  const post = {
    id: uid("p"),
    authorId: me.id,
    text: content,
    image: image || null,
    feeling: feeling || null,
    audience,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    reactions: {},
    comments: [],
    shares: [],
    savedBy: [],
  };
  mutate((prev) => ({
    ...prev,
    posts: [post, ...prev.posts],
    drafts: { post: "", feeling: null, image: null },
  }), { reason: "create-post" });
  return post;
}

export function updatePost(postId, { text, image }) {
  const me = currentUser();
  const post = getPost(postId);
  if (!me || !post || post.authorId !== me.id) throw new Error("You can only edit your own posts.");
  const content = (text || "").trim();
  if (!content && !image) throw new Error("A post needs text or an image.");
  mutate((prev) => ({
    ...prev,
    posts: prev.posts.map((item) =>
      item.id === postId ? { ...item, text: content, image: image ?? item.image, updatedAt: Date.now() } : item
    ),
  }), { reason: "edit-post" });
}

export function deletePost(postId) {
  const me = currentUser();
  const post = getPost(postId);
  if (!me || !post || post.authorId !== me.id) throw new Error("You can only delete your own posts.");
  mutate((prev) => ({
    ...prev,
    posts: prev.posts.filter((item) => item.id !== postId),
  }), { reason: "delete-post" });
}

export function reactToPost(postId, reaction = "like") {
  const me = currentUser();
  const post = getPost(postId);
  if (!me || !post) return;
  const current = post.reactions[me.id];
  const next = { ...post.reactions };
  if (current === reaction) delete next[me.id];
  else next[me.id] = reaction;
  if (!current && next[me.id]) {
    notify({
      userId: post.authorId,
      type: "reaction",
      fromId: me.id,
      postId,
      text: `${reaction === "like" ? "liked" : "reacted to"} your post`,
    });
  }
  mutate((prev) => ({
    ...prev,
    posts: prev.posts.map((item) => (item.id === postId ? { ...item, reactions: next } : item)),
  }), { reason: "react-post" });
}

export function addComment(postId, text) {
  const me = currentUser();
  const post = getPost(postId);
  const content = (text || "").trim();
  if (!me || !post) return;
  if (!content) throw new Error("Write a comment first.");
  const comment = {
    id: uid("c"),
    authorId: me.id,
    text: content,
    createdAt: Date.now(),
    likes: [],
  };
  notify({
    userId: post.authorId,
    type: "comment",
    fromId: me.id,
    postId,
    text: "commented on your post",
  });
  mutate((prev) => ({
    ...prev,
    posts: prev.posts.map((item) =>
      item.id === postId ? { ...item, comments: [...item.comments, comment] } : item
    ),
  }), { reason: "comment" });
  return comment;
}

export function deleteComment(postId, commentId) {
  const me = currentUser();
  if (!me) return;
  mutate((prev) => ({
    ...prev,
    posts: prev.posts.map((item) => {
      if (item.id !== postId) return item;
      return {
        ...item,
        comments: item.comments.filter((comment) => !(comment.id === commentId && comment.authorId === me.id)),
      };
    }),
  }), { reason: "delete-comment" });
}

export function likeComment(postId, commentId) {
  const me = currentUser();
  if (!me) return;
  mutate((prev) => ({
    ...prev,
    posts: prev.posts.map((item) => {
      if (item.id !== postId) return item;
      return {
        ...item,
        comments: item.comments.map((comment) => {
          if (comment.id !== commentId) return comment;
          const likes = comment.likes.includes(me.id)
            ? comment.likes.filter((id) => id !== me.id)
            : [...comment.likes, me.id];
          return { ...comment, likes };
        }),
      };
    }),
  }), { reason: "like-comment" });
}

export function sharePost(postId, text = "") {
  const me = currentUser();
  const original = getPost(postId);
  if (!me || !original) return;
  const share = {
    id: uid("p"),
    authorId: me.id,
    text: (text || "").trim(),
    image: null,
    feeling: null,
    audience: "public",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    reactions: {},
    comments: [],
    shares: [],
    savedBy: [],
    sharedFrom: original.sharedFrom || original.id,
  };
  notify({
    userId: original.authorId,
    type: "share",
    fromId: me.id,
    postId: original.id,
    text: "shared your post",
  });
  mutate((prev) => ({
    ...prev,
    posts: [
      share,
      ...prev.posts.map((item) =>
        item.id === original.id ? { ...item, shares: [...new Set([...item.shares, me.id])] } : item
      ),
    ],
  }), { reason: "share" });
}

export function toggleSavePost(postId) {
  const me = currentUser();
  if (!me) return;
  mutate((prev) => ({
    ...prev,
    posts: prev.posts.map((item) => {
      if (item.id !== postId) return item;
      const savedBy = item.savedBy.includes(me.id)
        ? item.savedBy.filter((id) => id !== me.id)
        : [...item.savedBy, me.id];
      return { ...item, savedBy };
    }),
  }), { reason: "save-post" });
}

export function createStory(image) {
  const me = currentUser();
  if (!me || !image) throw new Error("Choose a photo for your story.");
  const story = {
    id: uid("s"),
    userId: me.id,
    image,
    createdAt: Date.now(),
    viewers: [],
  };
  mutate((prev) => ({
    ...prev,
    stories: [story, ...prev.stories.filter((item) => item.userId !== me.id)],
  }), { reason: "story" });
}

export function viewStory(storyId) {
  const me = currentUser();
  if (!me) return;
  mutate((prev) => ({
    ...prev,
    stories: prev.stories.map((story) =>
      story.id === storyId && !story.viewers.includes(me.id)
        ? { ...story, viewers: [...story.viewers, me.id] }
        : story
    ),
  }), { reason: "view-story", silent: true });
}

export function sendFriendRequest(userId) {
  const me = currentUser();
  const target = getUser(userId);
  if (!me || !target || me.id === userId) return;
  if (me.friendIds.includes(userId) || target.requestIds.includes(me.id)) return;
  notify({
    userId,
    type: "friend",
    fromId: me.id,
    text: "sent you a friend request",
  });
  mutate((prev) => ({
    ...prev,
    users: prev.users.map((user) =>
      user.id === userId ? { ...user, requestIds: [...new Set([...user.requestIds, me.id])] } : user
    ),
  }), { reason: "friend-request" });
}

export function acceptFriendRequest(userId) {
  const me = currentUser();
  if (!me || !me.requestIds.includes(userId)) return;
  notify({
    userId,
    type: "friend",
    fromId: me.id,
    text: "accepted your friend request",
  });
  mutate((prev) => ({
    ...prev,
    users: prev.users.map((user) => {
      if (user.id === me.id) {
        return {
          ...user,
          requestIds: user.requestIds.filter((id) => id !== userId),
          friendIds: [...new Set([...user.friendIds, userId])],
        };
      }
      if (user.id === userId) {
        return {
          ...user,
          requestIds: user.requestIds.filter((id) => id !== me.id),
          friendIds: [...new Set([...user.friendIds, me.id])],
        };
      }
      return user;
    }),
  }), { reason: "accept-friend" });
}

export function declineFriendRequest(userId) {
  const me = currentUser();
  if (!me) return;
  mutate((prev) => ({
    ...prev,
    users: prev.users.map((user) =>
      user.id === me.id ? { ...user, requestIds: user.requestIds.filter((id) => id !== userId) } : user
    ),
  }), { reason: "decline-friend" });
}

export function unfriend(userId) {
  const me = currentUser();
  if (!me) return;
  mutate((prev) => ({
    ...prev,
    users: prev.users.map((user) => {
      if (user.id === me.id || user.id === userId) {
        return { ...user, friendIds: user.friendIds.filter((id) => id !== (user.id === me.id ? userId : me.id)) };
      }
      return user;
    }),
  }), { reason: "unfriend" });
}

export function getOrCreateConversation(userId) {
  const me = currentUser();
  if (!me) return null;
  const existing = state.conversations.find((convo) =>
    convo.participantIds.includes(me.id) && convo.participantIds.includes(userId)
  );
  if (existing) return existing;
  const conversation = {
    id: uid("m"),
    participantIds: [me.id, userId],
    messages: [],
  };
  mutate((prev) => ({
    ...prev,
    conversations: [conversation, ...prev.conversations],
  }), { reason: "start-conversation" });
  return conversation;
}

export function sendMessage(conversationId, text) {
  const me = currentUser();
  const content = (text || "").trim();
  if (!me || !content) throw new Error("Write a message first.");
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) throw new Error("Conversation not found.");
  const message = {
    id: uid("msg"),
    senderId: me.id,
    text: content,
    createdAt: Date.now(),
    readBy: [me.id],
  };
  const otherId = conversation.participantIds.find((id) => id !== me.id);
  notify({
    userId: otherId,
    type: "message",
    fromId: me.id,
    text: "sent you a message",
  });
  mutate((prev) => ({
    ...prev,
    conversations: prev.conversations.map((item) =>
      item.id === conversationId ? { ...item, messages: [...item.messages, message] } : item
    ),
  }), { reason: "message" });
}

export function markConversationRead(conversationId) {
  const me = currentUser();
  if (!me) return;
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) return;
  const needsUpdate = conversation.messages.some((message) => !message.readBy.includes(me.id));
  if (!needsUpdate) return;
  mutate((prev) => ({
    ...prev,
    conversations: prev.conversations.map((item) => {
      if (item.id !== conversationId) return item;
      return {
        ...item,
        messages: item.messages.map((message) =>
          message.readBy.includes(me.id) ? message : { ...message, readBy: [...message.readBy, me.id] }
        ),
      };
    }),
  }), { reason: "read-messages", silent: true });
}

export function markNotificationsRead(ids) {
  const me = currentUser();
  if (!me) return;
  mutate((prev) => ({
    ...prev,
    notifications: prev.notifications.map((item) => {
      if (item.userId !== me.id) return item;
      if (ids && !ids.includes(item.id)) return item;
      return { ...item, read: true };
    }),
  }), { reason: "read-notifications" });
}

export function toggleGroup(groupId) {
  const me = currentUser();
  if (!me) return;
  const current = new Set(state.joinedGroupIds[me.id] || []);
  if (current.has(groupId)) current.delete(groupId);
  else current.add(groupId);
  mutate((prev) => ({
    ...prev,
    joinedGroupIds: { ...prev.joinedGroupIds, [me.id]: [...current] },
  }), { reason: "group" });
}

export function rsvpEvent(eventId) {
  const me = currentUser();
  if (!me) return;
  mutate((prev) => ({
    ...prev,
    events: prev.events.map((event) => {
      if (event.id !== eventId) return event;
      const going = new Set(event.going || []);
      if (going.has(me.id)) going.delete(me.id);
      else going.add(me.id);
      return { ...event, going: [...going] };
    }),
  }), { reason: "event" });
}

export function feedPosts(userId) {
  const me = currentUser();
  const user = getUser(userId || me?.id);
  if (!user) return [];
  const visibleAuthors = new Set([user.id, ...user.friendIds]);
  return [...state.posts]
    .filter((post) => visibleAuthors.has(post.authorId) || post.audience === "public")
    .sort(byNewest);
}

export function userPosts(userId) {
  return state.posts.filter((post) => post.authorId === userId).sort(byNewest);
}

export function searchAll(query) {
  const q = query.trim().toLowerCase();
  if (!q) return { people: [], posts: [], groups: [] };
  const people = state.users.filter((user) =>
    user.name.toLowerCase().includes(q) ||
    user.bio.toLowerCase().includes(q) ||
    user.location.toLowerCase().includes(q)
  );
  const posts = state.posts.filter((post) => post.text.toLowerCase().includes(q)).sort(byNewest);
  const groups = state.groups.filter((group) =>
    group.name.toLowerCase().includes(q) || group.about.toLowerCase().includes(q)
  );
  return { people, posts, groups };
}

export function unreadNotifications() {
  const me = currentUser();
  if (!me) return [];
  return state.notifications.filter((item) => item.userId === me.id && !item.read);
}

export function unreadMessages() {
  const me = currentUser();
  if (!me) return 0;
  return state.conversations.reduce((total, convo) => {
    if (!convo.participantIds.includes(me.id)) return total;
    return total + convo.messages.filter((message) => message.senderId !== me.id && !message.readBy.includes(me.id)).length;
  }, 0);
}

export function myNotifications() {
  const me = currentUser();
  if (!me) return [];
  return state.notifications.filter((item) => item.userId === me.id).sort(byNewest);
}

export function myConversations() {
  const me = currentUser();
  if (!me) return [];
  return state.conversations
    .filter((convo) => convo.participantIds.includes(me.id))
    .map((convo) => {
      const last = convo.messages[convo.messages.length - 1];
      return { ...convo, last };
    })
    .sort((a, b) => (b.last?.createdAt || 0) - (a.last?.createdAt || 0));
}

export function relationship(userId) {
  const me = currentUser();
  const other = getUser(userId);
  if (!me || !other) return "none";
  if (me.id === userId) return "self";
  if (me.friendIds.includes(userId)) return "friends";
  if (me.requestIds.includes(userId)) return "incoming";
  if (other.requestIds.includes(me.id)) return "outgoing";
  return "none";
}

export function resetDemoData() {
  return createSeedState().then((seed) => {
    const keepSession = state.session && seed.users.some((user) => user.id === state.session.userId);
    state = {
      ...seed,
      session: keepSession ? state.session : { userId: "u_rehan", rememberMe: true },
    };
    emit({ reason: "reset" });
  });
}

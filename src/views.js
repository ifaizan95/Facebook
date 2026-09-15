import * as store from "./store.js";
import { navigate } from "./router.js";
import { confirmDialog, showModal, showToast } from "./ui.js";
import { debounce, el, fileToDataUrl, formatCount, formatTime, timeAgo } from "./utils.js";
import { renderComposer, renderPost, renderPostList } from "./components/post.js";
import { renderStoryGallery } from "./components/stories.js";

function peopleRow(user) {
  const rel = store.relationship(user.id);
  const row = el("div", { class: "people-row" }, [
    el("button", { class: "avatar-btn", type: "button", "aria-label": user.name, onclick: () => navigate(`/profile/${user.id}`) }, [
      el("img", { src: user.avatar, alt: "" }),
    ]),
    el("div", { class: "people-meta" }, [
      el("button", { class: "linkish", type: "button", onclick: () => navigate(`/profile/${user.id}`) }, [user.name]),
      el("span", {}, [user.location || user.workplace || user.bio]),
    ]),
  ]);
  const actions = el("div", { class: "people-actions" });
  if (rel === "self") {
    actions.append(el("span", { class: "chip" }, ["You"]));
  } else if (rel === "friends") {
    actions.append(
      el("button", { class: "btn btn-ghost sm", type: "button", onclick: () => navigate(`/messages/${store.getOrCreateConversation(user.id).id}`) }, ["Message"]),
      el("button", { class: "btn btn-ghost sm", type: "button", onclick: async () => {
        const ok = await confirmDialog(`Unfriend ${user.name}?`, { confirmLabel: "Unfriend" });
        if (ok) store.unfriend(user.id);
      } }, ["Unfriend"])
    );
  } else if (rel === "incoming") {
    actions.append(
      el("button", { class: "btn btn-primary sm", type: "button", onclick: () => store.acceptFriendRequest(user.id) }, ["Accept"]),
      el("button", { class: "btn btn-ghost sm", type: "button", onclick: () => store.declineFriendRequest(user.id) }, ["Decline"])
    );
  } else if (rel === "outgoing") {
    actions.append(el("span", { class: "chip" }, ["Request sent"]));
  } else {
    actions.append(el("button", { class: "btn btn-primary sm", type: "button", onclick: () => {
      store.sendFriendRequest(user.id);
      showToast("Friend request sent.");
    } }, ["Add friend"]));
  }
  row.append(actions);
  return row;
}

export function renderHome() {
  const me = store.currentUser();
  const wrap = el("div", { class: "view-home" });
  wrap.append(renderStoryGallery(), renderComposer(), renderPostList(store.feedPosts(me.id), "Follow friends or create a post to get your feed started."));
  return wrap;
}

export function renderProfile(userId) {
  const me = store.currentUser();
  const user = store.getUser(userId) || me;
  const rel = store.relationship(user.id);
  const posts = store.userPosts(user.id);
  const wrap = el("div", { class: "profile-page" });
  const cover = el("div", { class: "cover", style: { backgroundImage: `url(${user.cover})` } });
  const header = el("section", { class: "profile-header stories-container" }, [
    cover,
    el("div", { class: "profile-identity" }, [
      el("img", { class: "profile-avatar", src: user.avatar, alt: `${user.name} profile photo` }),
      el("div", {}, [
        el("h1", {}, [user.name]),
        el("p", {}, [`${formatCount(user.friendIds.length)} friends · ${formatCount(posts.length)} posts`]),
        user.bio ? el("p", { class: "profile-bio" }, [user.bio]) : null,
      ]),
    ]),
  ]);

  const actions = el("div", { class: "profile-actions" });
  if (rel === "self") {
    actions.append(el("button", { class: "btn btn-primary", type: "button", onclick: () => openEditProfile(user) }, ["Edit profile"]));
  } else if (rel === "friends") {
    actions.append(
      el("button", { class: "btn btn-primary", type: "button", onclick: () => navigate(`/messages/${store.getOrCreateConversation(user.id).id}`) }, ["Message"]),
      el("button", { class: "btn btn-ghost", type: "button", onclick: async () => {
        if (await confirmDialog(`Unfriend ${user.name}?`, { confirmLabel: "Unfriend" })) store.unfriend(user.id);
      } }, ["Friends"])
    );
  } else if (rel === "incoming") {
    actions.append(
      el("button", { class: "btn btn-primary", type: "button", onclick: () => store.acceptFriendRequest(user.id) }, ["Accept request"]),
      el("button", { class: "btn btn-ghost", type: "button", onclick: () => store.declineFriendRequest(user.id) }, ["Decline"])
    );
  } else if (rel === "outgoing") {
    actions.append(el("button", { class: "btn btn-ghost", type: "button", disabled: true }, ["Request sent"]));
  } else {
    actions.append(el("button", { class: "btn btn-primary", type: "button", onclick: () => store.sendFriendRequest(user.id) }, ["Add friend"]));
  }
  header.append(actions);
  wrap.append(header);

  const about = el("aside", { class: "profile-about stories-container" }, [
    el("h2", {}, ["About"]),
    user.workplace ? infoLine("/facebook/profile-job.png", "Works at", user.workplace) : null,
    user.education ? infoLine("/facebook/profile-study.png", "Studied", user.education) : null,
    user.location ? infoLine("/facebook/profile-location.png", "Lives in", user.location) : null,
    infoLine("/facebook/profile-home.png", "Joined", new Date(user.joinedAt).toLocaleDateString()),
  ]);

  const friendsCard = el("aside", { class: "profile-about stories-container" }, [
    el("div", { class: "sidebar-title" }, [
      el("h2", {}, ["Friends"]),
      el("a", { href: "/friends", "data-link": "true" }, ["See all"]),
    ]),
    el("div", { class: "friend-grid" }, user.friendIds.slice(0, 6).map((id) => {
      const friend = store.getUser(id);
      if (!friend) return null;
      const btn = el("button", { class: "friend-tile", type: "button", onclick: () => navigate(`/profile/${friend.id}`) }, [
        el("img", { src: friend.avatar, alt: "" }),
        el("span", {}, [friend.name.split(" ")[0]]),
      ]);
      return btn;
    })),
  ]);

  const feedCol = el("div", { class: "profile-feed" });
  if (rel === "self") feedCol.append(renderComposer());
  feedCol.append(renderPostList(posts, `${user.name.split(" ")[0]} has not posted yet.`));

  wrap.append(el("div", { class: "profile-grid" }, [el("div", {}, [about, friendsCard]), feedCol]));
  return wrap;
}

function infoLine(icon, label, value) {
  return el("p", { class: "about-line" }, [
    el("img", { src: icon, alt: "" }),
    el("span", {}, [`${label} ${value}`]),
  ]);
}

function openEditProfile(user) {
  const name = el("input", { class: "text-input", value: user.name, "aria-label": "Name" });
  const bio = el("textarea", { class: "composer-input", rows: "3", "aria-label": "Bio" });
  bio.value = user.bio || "";
  const location = el("input", { class: "text-input", value: user.location || "", "aria-label": "Location" });
  const workplace = el("input", { class: "text-input", value: user.workplace || "", "aria-label": "Workplace" });
  const education = el("input", { class: "text-input", value: user.education || "", "aria-label": "Education" });
  let avatar = user.avatar;
  let cover = user.cover;
  const avatarInput = el("input", { type: "file", accept: "image/*", class: "sr-only" });
  const coverInput = el("input", { type: "file", accept: "image/*", class: "sr-only" });
  avatarInput.addEventListener("change", async () => {
    if (avatarInput.files[0]) avatar = await fileToDataUrl(avatarInput.files[0], 480);
  });
  coverInput.addEventListener("change", async () => {
    if (coverInput.files[0]) cover = await fileToDataUrl(coverInput.files[0], 1400);
  });
  showModal({
    title: "Edit profile",
    content: el("form", { class: "form-stack", onsubmit: (event) => event.preventDefault() }, [
      labeled("Name", name),
      labeled("Bio", bio),
      labeled("Location", location),
      labeled("Workplace", workplace),
      labeled("Education", education),
      avatarInput,
      coverInput,
      el("div", { class: "inline-actions" }, [
        el("button", { class: "btn btn-ghost", type: "button", onclick: () => avatarInput.click() }, ["Change photo"]),
        el("button", { class: "btn btn-ghost", type: "button", onclick: () => coverInput.click() }, ["Change cover"]),
      ]),
    ]),
    actions: [
      { label: "Cancel" },
      {
        label: "Save",
        primary: true,
        onClick: () => {
          store.updateProfile({
            name: name.value.trim() || user.name,
            bio: bio.value.trim(),
            location: location.value.trim(),
            workplace: workplace.value.trim(),
            education: education.value.trim(),
            avatar,
            cover,
          });
          showToast("Profile updated.");
        },
      },
    ],
  });
}

function labeled(label, control) {
  const id = `${label.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;
  control.setAttribute("id", id);
  return el("div", { class: "field" }, [
    el("label", { for: id }, [label]),
    control,
  ]);
}

export function renderFriends() {
  const me = store.currentUser();
  const requests = me.requestIds.map((id) => store.getUser(id)).filter(Boolean);
  const friends = me.friendIds.map((id) => store.getUser(id)).filter(Boolean);
  const suggestions = store.getState().users.filter((user) => user.id !== me.id && store.relationship(user.id) === "none");
  const wrap = el("div", { class: "stack-view" });
  wrap.append(el("section", { class: "stories-container" }, [
    el("h1", { class: "view-title" }, ["Friends"]),
    requests.length
      ? el("div", {}, [el("h2", { class: "section-title" }, ["Friend requests"]), ...requests.map((user) => peopleRow(user))])
      : el("p", { class: "muted" }, ["No pending friend requests."]),
  ]));
  wrap.append(el("section", { class: "stories-container" }, [
    el("h2", { class: "section-title" }, ["Your friends"]),
    friends.length ? el("div", {}, friends.map((user) => peopleRow(user))) : el("p", { class: "muted" }, ["You have not added friends yet."]),
  ]));
  wrap.append(el("section", { class: "stories-container" }, [
    el("h2", { class: "section-title" }, ["People you may know"]),
    suggestions.length ? el("div", {}, suggestions.map((user) => peopleRow(user))) : el("p", { class: "muted" }, ["No more suggestions right now."]),
  ]));
  return wrap;
}

export function renderMessages(conversationId) {
  const me = store.currentUser();
  const convos = store.myConversations();
  const active = convos.find((item) => item.id === conversationId) || convos[0] || null;
  const layout = el("section", { class: `messages-layout ${conversationId ? "has-thread" : ""}` });
  const list = el("div", { class: "conversation-list" }, [
    el("div", { class: "messages-head" }, [
      el("h1", {}, ["Messages"]),
      conversationId ? el("button", { class: "btn btn-ghost sm mobile-only", type: "button", onclick: () => navigate("/messages") }, ["Back"]) : null,
    ]),
  ]);
  if (!convos.length) {
    list.append(el("div", { class: "empty-card compact" }, [el("p", {}, ["No conversations yet. Message a friend from their profile."])]));
  }
  convos.forEach((convo) => {
    const otherId = convo.participantIds.find((id) => id !== me.id);
    const other = store.getUser(otherId);
    const unread = convo.messages.some((message) => message.senderId !== me.id && !message.readBy.includes(me.id));
    const btn = el("button", {
      class: `convo-item ${active?.id === convo.id ? "is-active" : ""} ${unread ? "unread" : ""}`,
      type: "button",
    }, [
      el("img", { src: other?.avatar, alt: "" }),
      el("div", { class: "convo-meta" }, [
        el("strong", {}, [other?.name || "Unknown"]),
        el("span", {}, [convo.last?.text || "No messages yet"]),
      ]),
      el("time", {}, [convo.last ? timeAgo(convo.last.createdAt) : ""]),
    ]);
    btn.addEventListener("click", () => navigate(`/messages/${convo.id}`));
    list.append(btn);
  });

  const thread = el("div", { class: "conversation-thread" });
  if (!active) {
    thread.append(el("div", { class: "empty-card" }, [el("h3", {}, ["Select a conversation"]), el("p", {}, ["Choose someone from the left to start chatting."])]));
  } else {
    const otherId = active.participantIds.find((id) => id !== me.id);
    const other = store.getUser(otherId);
    store.markConversationRead(active.id);
    const history = el("div", { class: "message-history" });
    if (!active.messages.length) {
      history.append(el("p", { class: "muted center" }, ["No messages yet. Say hello."]));
    }
    active.messages.forEach((message) => {
      history.append(el("div", { class: `bubble-row ${message.senderId === me.id ? "mine" : ""}` }, [
        el("div", { class: "bubble" }, [
          el("p", {}, [message.text]),
          el("time", {}, [formatTime(message.createdAt)]),
        ]),
      ]));
    });
    const input = el("input", { class: "text-input", type: "text", placeholder: `Message ${other?.name || ""}`, "aria-label": "Message text" });
    const send = () => {
      try {
        store.sendMessage(active.id, input.value);
        input.value = "";
      } catch (error) {
        showToast(error.message, "error");
      }
    };
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        send();
      }
    });
    thread.append(
      el("div", { class: "thread-head" }, [
        el("button", { class: "icon-btn mobile-only", type: "button", "aria-label": "Back to conversations", onclick: () => navigate("/messages") }, ["←"]),
        el("button", { class: "avatar-btn sm", type: "button", onclick: () => navigate(`/profile/${other.id}`) }, [el("img", { src: other.avatar, alt: "" })]),
        el("button", { class: "linkish", type: "button", onclick: () => navigate(`/profile/${other.id}`) }, [other.name]),
      ]),
      history,
      el("div", { class: "message-composer" }, [
        input,
        el("button", { class: "btn btn-primary", type: "button", onclick: send }, ["Send"]),
      ])
    );
    requestAnimationFrame(() => { history.scrollTop = history.scrollHeight; });
  }
  layout.append(list, thread);
  return layout;
}

export function renderNotifications() {
  const items = store.myNotifications();
  const wrap = el("section", { class: "stories-container" }, [
    el("div", { class: "sidebar-title" }, [
      el("h1", { class: "view-title" }, ["Notifications"]),
      items.some((item) => !item.read)
        ? el("button", { class: "btn btn-ghost sm", type: "button", onclick: () => store.markNotificationsRead() }, ["Mark all as read"])
        : null,
    ]),
  ]);
  if (!items.length) {
    wrap.append(el("div", { class: "empty-card compact" }, [el("p", {}, ["You are all caught up. Likes, comments, and friend requests will land here."])]));
    return wrap;
  }
  items.forEach((item) => {
    const from = store.getUser(item.fromId);
    const btn = el("button", { class: `notice ${item.read ? "" : "unread"}`, type: "button" }, [
      el("img", { src: from?.avatar, alt: "" }),
      el("div", {}, [
        el("p", {}, [el("strong", {}, [from?.name || "Someone"]), ` ${item.text}`]),
        el("time", {}, [timeAgo(item.createdAt)]),
      ]),
    ]);
    btn.addEventListener("click", () => {
      store.markNotificationsRead([item.id]);
      if (item.type === "friend") navigate("/friends");
      else if (item.type === "message") navigate("/messages");
      else if (item.postId) navigate("/");
      else navigate("/");
    });
    wrap.append(btn);
  });
  return wrap;
}

export function renderSearch(query = "") {
  const wrap = el("section", { class: "stack-view" });
  const input = el("input", {
    class: "text-input search-page-input",
    type: "search",
    value: query,
    placeholder: "Search people, posts, and groups",
    "aria-label": "Search Connect",
  });
  const results = el("div", { class: "search-results" });
  const run = (value) => {
    const data = store.searchAll(value);
    results.replaceChildren();
    if (!value.trim()) {
      results.append(el("div", { class: "empty-card" }, [el("h3", {}, ["Search Connect"]), el("p", {}, ["Try a name, a keyword from a post, or a group like “design”."])]));
      return;
    }
    if (!data.people.length && !data.posts.length && !data.groups.length) {
      results.append(el("div", { class: "empty-card" }, [el("h3", {}, ["No results"]), el("p", {}, [`Nothing matched “${value.trim()}”.`])]));
      return;
    }
    if (data.people.length) {
      results.append(el("section", { class: "stories-container" }, [
        el("h2", { class: "section-title" }, ["People"]),
        ...data.people.map((user) => peopleRow(user)),
      ]));
    }
    if (data.groups.length) {
      results.append(el("section", { class: "stories-container" }, [
        el("h2", { class: "section-title" }, ["Groups"]),
        ...data.groups.map((group) => el("button", { class: "people-row", type: "button", onclick: () => navigate(`/groups/${group.id}`) }, [
          el("img", { class: "group-thumb", src: group.image, alt: "" }),
          el("div", { class: "people-meta" }, [el("strong", {}, [group.name]), el("span", {}, [group.about])]),
        ])),
      ]));
    }
    if (data.posts.length) {
      const list = el("section", { class: "stories-container" }, [el("h2", { class: "section-title" }, ["Posts"])]);
      data.posts.forEach((post) => list.append(renderPost(post)));
      results.append(list);
    }
  };
  const debounced = debounce((value) => {
    const next = value.trim() ? `/search?q=${encodeURIComponent(value.trim())}` : "/search";
    window.history.replaceState({}, "", next);
    run(value);
  }, 250);
  input.addEventListener("input", () => debounced(input.value));
  const clear = el("button", { class: "btn btn-ghost", type: "button" }, ["Clear"]);
  clear.addEventListener("click", () => {
    input.value = "";
    navigate("/search", { replace: true });
    run("");
    input.focus();
  });
  wrap.append(
    el("div", { class: "search-toolbar stories-container" }, [
      el("h1", { class: "view-title" }, ["Search"]),
      el("div", { class: "search-toolbar-row" }, [input, clear]),
    ]),
    results
  );
  run(query);
  requestAnimationFrame(() => input.focus());
  return wrap;
}

export function renderSettings() {
  const me = store.currentUser();
  const settings = store.getSettings();
  const wrap = el("section", { class: "stories-container settings-page" }, [
    el("h1", { class: "view-title" }, ["Settings"]),
    el("p", { class: "muted" }, ["Preferences stay in this browser. This demo does not use a backend."]),
  ]);

  wrap.append(toggleRow("Dark mode", settings.theme === "dark", (on) => store.updateSettings({ theme: on ? "dark" : "light" })));
  wrap.append(toggleRow("Hide contacts", settings.hideChat, (on) => store.updateSettings({ hideChat: on })));
  wrap.append(toggleRow("Compact feed", settings.compactMode, (on) => store.updateSettings({ compactMode: on })));

  wrap.append(el("div", { class: "settings-block" }, [
    el("h2", {}, ["Account"]),
    el("p", {}, [me.email]),
    el("button", { class: "btn btn-ghost", type: "button", onclick: () => openEditProfile(me) }, ["Edit profile"]),
    el("button", { class: "btn btn-ghost", type: "button", onclick: () => navigate(`/profile/${me.id}`) }, ["View profile"]),
  ]));

  wrap.append(el("div", { class: "settings-block" }, [
    el("h2", {}, ["Demo data"]),
    el("p", { class: "muted" }, ["Reset restores the original sample users, posts, and messages in this browser."]),
    el("button", { class: "btn btn-ghost danger", type: "button", onclick: async () => {
      if (await confirmDialog("Reset all local Connect data in this browser?", { confirmLabel: "Reset" })) {
        await store.resetDemoData();
        showToast("Demo data restored.");
      }
    } }, ["Reset local data"]),
  ]));
  return wrap;
}

function toggleRow(label, on, onChange) {
  const input = el("input", { type: "checkbox", role: "switch", "aria-checked": String(on) });
  input.checked = on;
  input.addEventListener("change", () => onChange(input.checked));
  return el("label", { class: "toggle-row" }, [
    el("span", {}, [label]),
    input,
  ]);
}

export function renderNews() {
  const wrap = el("div", { class: "stack-view" }, [el("h1", { class: "view-title" }, ["Latest News"])]);
  store.getState().news.forEach((item) => {
    wrap.append(el("article", { class: "stories-container news-card" }, [
      el("div", { class: "news-head" }, [
        el("img", { src: item.image, alt: "" }),
        el("div", {}, [el("h2", {}, [item.title]), el("p", { class: "muted" }, [item.source])]),
      ]),
      el("p", {}, [item.body]),
    ]));
  });
  return wrap;
}

export function renderGroups(groupId) {
  const me = store.currentUser();
  const joined = new Set(store.getState().joinedGroupIds[me.id] || []);
  const wrap = el("div", { class: "stack-view" }, [el("h1", { class: "view-title" }, ["Groups"])]);
  store.getState().groups.forEach((group) => {
    const isJoined = joined.has(group.id);
    const card = el("article", { class: `stories-container group-card ${groupId === group.id ? "is-active" : ""}` }, [
      el("img", { src: group.image, alt: "" }),
      el("div", {}, [
        el("h2", {}, [group.name]),
        el("p", {}, [group.about]),
        el("p", { class: "muted" }, [`${formatCount(group.members)} members`]),
        el("button", {
          class: `btn ${isJoined ? "btn-ghost" : "btn-primary"} sm`,
          type: "button",
          onclick: () => store.toggleGroup(group.id),
        }, [isJoined ? "Leave" : "Join"]),
      ]),
    ]);
    wrap.append(card);
  });
  return wrap;
}

export function renderMarketplace() {
  const wrap = el("div", { class: "stack-view" }, [
    el("h1", { class: "view-title" }, ["Marketplace"]),
    el("p", { class: "muted" }, ["Local listings are simulated and stored in this browser only."]),
  ]);
  const grid = el("div", { class: "market-grid" });
  store.getState().listings.forEach((item) => {
    const seller = store.getUser(item.sellerId);
    grid.append(el("article", { class: "market-card" }, [
      el("img", { src: item.image, alt: item.title }),
      el("h2", {}, [item.title]),
      el("p", {}, [item.price]),
      el("p", { class: "muted" }, [`Listed by ${seller?.name || "a neighbor"}`]),
      el("button", { class: "btn btn-primary sm", type: "button", onclick: () => {
        const convo = store.getOrCreateConversation(item.sellerId);
        store.sendMessage(convo.id, `Hi, is "${item.title}" still available?`);
        navigate(`/messages/${convo.id}`);
      } }, ["Message seller"]),
    ]));
  });
  wrap.append(grid);
  return wrap;
}

export function renderWatch() {
  const wrap = el("div", { class: "stack-view" }, [el("h1", { class: "view-title" }, ["Watch"])]);
  store.getState().watchItems.forEach((item) => {
    const author = store.getUser(item.authorId);
    wrap.append(el("article", { class: "stories-container watch-card" }, [
      el("div", { class: "watch-thumb", style: { backgroundImage: `url(${item.image})` } }, [
        el("button", { class: "play-btn", type: "button", "aria-label": `Play ${item.title}`, onclick: () => showToast("Video playback is simulated in this demo.") }, ["▶"]),
      ]),
      el("h2", {}, [item.title]),
      el("p", { class: "muted" }, [author?.name || "Creator"]),
    ]));
  });
  return wrap;
}

export function renderEvents() {
  const me = store.currentUser();
  const wrap = el("div", { class: "stack-view" }, [el("h1", { class: "view-title" }, ["Events"])]);
  store.getState().events.forEach((event) => {
    const going = (event.going || []).includes(me.id);
    wrap.append(el("article", { class: "stories-container event-row" }, [
      el("div", { class: "left-event" }, [el("h4", {}, [event.day]), el("span", {}, [event.month])]),
      el("div", { class: "right-event" }, [
        el("h2", {}, [event.title]),
        el("p", {}, [event.place]),
        el("p", {}, [event.description]),
        el("button", { class: `btn ${going ? "btn-ghost" : "btn-primary"} sm`, type: "button", onclick: () => store.rsvpEvent(event.id) }, [going ? "Going" : "RSVP"]),
      ]),
    ]));
  });
  return wrap;
}

export function renderAuth(mode = "login") {
  const box = el("div", { class: "auth-page" });
  const form = el("form", { class: "auth-card", novalidate: true });
  const title = el("h1", {}, [mode === "signup" ? "Create an account" : `Log in to ${document.title.split(" ")[0] || "Connect"}`]);
  const name = el("input", { class: "text-input", type: "text", autocomplete: "name", "aria-label": "Full name" });
  const email = el("input", { class: "text-input", type: "email", autocomplete: "username", "aria-label": "Email", required: true });
  const password = el("input", { class: "text-input", type: "password", autocomplete: mode === "signup" ? "new-password" : "current-password", "aria-label": "Password", required: true });
  const remember = el("input", { type: "checkbox", checked: true, id: "remember-me" });
  const error = el("p", { class: "form-error", role: "alert" });
  const submit = el("button", { class: "btn btn-primary auth-submit", type: "submit" }, [mode === "signup" ? "Sign up" : "Log in"]);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    submit.disabled = true;
    try {
      if (mode === "signup") {
        await store.signup({ name: name.value, email: email.value, password: password.value, rememberMe: remember.checked });
        showToast("Welcome to Connect.");
      } else {
        await store.login({ email: email.value, password: password.value, rememberMe: remember.checked });
        showToast("Welcome back.");
      }
      navigate("/", { replace: true });
    } catch (err) {
      error.textContent = err.message;
    } finally {
      submit.disabled = false;
    }
  });

  form.append(title);
  if (mode === "signup") form.append(labeled("Full name", name));
  form.append(
    labeled("Email", email),
    labeled("Password", password),
    el("label", { class: "check-row", for: "remember-me" }, [remember, "Keep me logged in on this browser"]),
    error,
    submit
  );
  if (mode === "login") {
    form.append(el("p", { class: "auth-switch" }, [
      "New here? ",
      el("button", { class: "linkish", type: "button", onclick: () => navigate("/signup") }, ["Create an account"]),
    ]));
  } else {
    form.append(el("p", { class: "auth-switch" }, [
      "Already have an account? ",
      el("button", { class: "linkish", type: "button", onclick: () => navigate("/login") }, ["Log in"]),
    ]));
  }

  const demo = el("aside", { class: "auth-demo" }, [
    el("h2", {}, ["Connect"]),
    el("p", {}, ["A Facebook-inspired social network rebuilt from the original static layout. Posts, messages, and profile edits stay in your browser."]),
    el("p", { class: "auth-note" }, ["This is frontend-only authentication. It is not secure and is not a real account system."]),
    el("div", { class: "demo-box" }, [
      el("h3", {}, ["Demo account"]),
      el("p", {}, ["rehan@connect.app"]),
      el("p", {}, ["password123"]),
      el("button", { class: "btn btn-ghost", type: "button", onclick: () => {
        email.value = "rehan@connect.app";
        password.value = "password123";
        email.focus();
      } }, ["Fill demo login"]),
    ]),
  ]);

  box.append(el("div", { class: "auth-grid" }, [demo, form]));
  return box;
}

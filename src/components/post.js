import * as store from "../store.js";
import { navigate } from "../router.js";
import { confirmDialog, showModal, showToast, showMenu } from "../ui.js";
import {
  el,
  FEELINGS,
  fileToDataUrl,
  formatCount,
  reactionMeta,
  REACTIONS,
  timeAgo,
} from "../utils.js";

function reactionSummary(reactions = {}) {
  const counts = {};
  Object.values(reactions).forEach((id) => {
    counts[id] = (counts[id] || 0) + 1;
  });
  const ordered = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    total: Object.keys(reactions).length,
    ordered,
    top: ordered.slice(0, 3).map(([id]) => reactionMeta(id)),
  };
}

function authorLink(user) {
  const button = el("button", { class: "linkish", type: "button" }, [user?.name || "Unknown"]);
  button.addEventListener("click", () => navigate(`/profile/${user.id}`));
  return button;
}

function avatarButton(user, extraClass = "") {
  const button = el("button", {
    class: `avatar-btn ${extraClass}`,
    type: "button",
    "aria-label": `${user?.name || "User"} profile`,
  }, [
    el("img", { src: user?.avatar || "/facebook/profile-pic.png", alt: "" }),
  ]);
  button.addEventListener("click", () => navigate(`/profile/${user.id}`));
  return button;
}

function renderEmbeddedPost(post) {
  const original = store.getPost(post.sharedFrom);
  if (!original) return el("div", { class: "shared-missing" }, ["Original post is no longer available."]);
  const author = store.getUser(original.authorId);
  return el("article", { class: "shared-post" }, [
    el("div", { class: "post-head" }, [
      avatarButton(author, "sm"),
      el("div", {}, [
        el("div", { class: "post-author" }, [authorLink(author)]),
        el("div", { class: "post-meta" }, [`${timeAgo(original.createdAt)} · ${original.audience === "public" ? "Public" : "Friends"}`]),
      ]),
    ]),
    original.text ? el("p", { class: "post-text" }, [original.text]) : null,
    original.image ? el("img", { class: "post-image", src: original.image, alt: "Shared post image" }) : null,
  ]);
}

function commentRow(post, comment) {
  const author = store.getUser(comment.authorId);
  const me = store.currentUser();
  const liked = comment.likes.includes(me.id);
  const row = el("div", { class: "comment" }, [
    avatarButton(author, "sm"),
    el("div", { class: "comment-body" }, [
      el("div", { class: "comment-bubble" }, [
        el("strong", {}, [author?.name || "User"]),
        el("p", {}, [comment.text]),
      ]),
      el("div", { class: "comment-actions" }, [
        el("button", {
          class: liked ? "is-active" : "",
          type: "button",
          "aria-pressed": String(liked),
          onclick: () => store.likeComment(post.id, comment.id),
        }, [liked ? "Liked" : "Like"]),
        el("span", {}, [timeAgo(comment.createdAt)]),
        comment.likes.length ? el("span", {}, [formatCount(comment.likes.length)]) : null,
      ]),
    ]),
  ]);
  if (comment.authorId === me.id) {
    const del = el("button", {
      class: "comment-delete",
      type: "button",
      "aria-label": "Delete comment",
    }, ["Delete"]);
    del.addEventListener("click", async () => {
      const ok = await confirmDialog("Delete this comment?", { confirmLabel: "Delete", title: "Delete comment" });
      if (ok) store.deleteComment(post.id, comment.id);
    });
    row.querySelector(".comment-actions").append(del);
  }
  return row;
}

export function renderComposer(onPosted) {
  const me = store.currentUser();
  const draft = store.getState().drafts;
  const box = el("section", { class: "write-post-container composer-card", "aria-label": "Create a post" });
  const textarea = el("textarea", {
    class: "composer-input",
    rows: "3",
    placeholder: `What's on your mind, ${me.name.split(" ")[0]}?`,
    "aria-label": "Post text",
  });
  textarea.value = draft.post || "";
  const preview = el("div", { class: "composer-preview hidden" });
  const feelingChip = el("div", { class: "feeling-chip hidden" });

  const refreshPreview = () => {
    const { image, feeling } = store.getState().drafts;
    preview.classList.toggle("hidden", !image);
    preview.replaceChildren();
    if (image) {
      preview.append(
        el("img", { src: image, alt: "Selected post image" }),
        el("button", {
          class: "icon-btn preview-remove",
          type: "button",
          "aria-label": "Remove image",
          onclick: () => {
            store.setDraft({ image: null });
            refreshPreview();
          },
        }, ["×"])
      );
    }
    feelingChip.classList.toggle("hidden", !feeling);
    feelingChip.textContent = feeling ? `${feeling.emoji} feeling ${feeling.label}` : "";
  };

  textarea.addEventListener("input", () => store.setDraft({ post: textarea.value }));

  const publish = () => {
    try {
      const current = store.getState().drafts;
      store.createPost({
        text: textarea.value,
        image: current.image,
        feeling: current.feeling,
      });
      textarea.value = "";
      refreshPreview();
      showToast("Your post is live.");
      onPosted?.();
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const photoInput = el("input", { type: "file", accept: "image/*", class: "sr-only", "aria-hidden": "true" });
  photoInput.addEventListener("change", async () => {
    const file = photoInput.files?.[0];
    photoInput.value = "";
    if (!file) return;
    try {
      const image = await fileToDataUrl(file);
      store.setDraft({ image });
      refreshPreview();
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  const liveBtn = el("button", { class: "composer-action", type: "button" }, [
    el("img", { src: "/facebook/live-video.png", alt: "" }),
    el("span", {}, ["Live Video"]),
  ]);
  liveBtn.addEventListener("click", () => {
    store.setDraft({ feeling: { id: "live", label: "live", emoji: "🔴" } });
    if (!textarea.value.trim()) textarea.value = `${me.name.split(" ")[0]} is live.`;
    store.setDraft({ post: textarea.value });
    refreshPreview();
    showToast("Live rooms are simulated here. Publish to share a live update.");
  });

  const photoBtn = el("button", { class: "composer-action", type: "button" }, [
    el("img", { src: "/facebook/photo.png", alt: "" }),
    el("span", {}, ["Photo/Video"]),
  ]);
  photoBtn.addEventListener("click", () => photoInput.click());

  const feelingBtn = el("button", { class: "composer-action", type: "button" }, [
    el("img", { src: "/facebook/feeling.png", alt: "" }),
    el("span", {}, ["Feeling/Activity"]),
  ]);
  feelingBtn.addEventListener("click", () => {
    const grid = el("div", { class: "feeling-grid" }, FEELINGS.map((feeling) => {
      const button = el("button", { class: "feeling-option", type: "button" }, [`${feeling.emoji} ${feeling.label}`]);
      button.addEventListener("click", () => {
        store.setDraft({ feeling });
        refreshPreview();
        document.querySelector(".overlay")?.remove();
      });
      return button;
    }));
    showModal({
      title: "How are you feeling?",
      content: grid,
      actions: [{ label: "Clear", onClick: () => { store.setDraft({ feeling: null }); refreshPreview(); } }],
    });
  });

  box.append(
    el("div", { class: "user-profile" }, [
      avatarButton(me),
      el("div", {}, [
        el("p", {}, [me.name]),
        el("small", {}, ["Public"]),
      ]),
    ]),
    el("div", { class: "post-input-container" }, [
      textarea,
      feelingChip,
      preview,
      photoInput,
      el("div", { class: "add-post-links composer-actions" }, [liveBtn, photoBtn, feelingBtn]),
      el("button", { class: "btn btn-primary composer-submit", type: "button", onclick: publish }, ["Post"]),
    ])
  );
  refreshPreview();
  return box;
}

export function renderPost(post, { onChange } = {}) {
  const me = store.currentUser();
  const author = store.getUser(post.authorId);
  const mine = author?.id === me.id;
  const myReaction = post.reactions[me.id];
  const summary = reactionSummary(post.reactions);
  const article = el("article", { class: "stories-container post-card", dataset: { postId: post.id } });

  const moreBtn = el("button", {
    class: "icon-btn post-more",
    type: "button",
    "aria-label": "Post actions",
    "aria-haspopup": "menu",
    "aria-expanded": "false",
  }, [el("img", { src: "/facebook/more.png", alt: "" })]);
  moreBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const items = [
      {
        label: post.savedBy.includes(me.id) ? "Unsave post" : "Save post",
        onClick: () => { store.toggleSavePost(post.id); showToast(post.savedBy.includes(me.id) ? "Removed from saved." : "Saved."); },
      },
    ];
    if (mine) {
      items.push(
        { label: "Edit post", onClick: () => editPost(post) },
        { label: "Delete post", onClick: async () => {
          const ok = await confirmDialog("Delete this post? This cannot be undone.", { confirmLabel: "Delete", title: "Delete post" });
          if (ok) {
            store.deletePost(post.id);
            showToast("Post deleted.");
          }
        } },
      );
    }
    showMenu(moreBtn, items);
  });

  const feeling = post.feeling ? ` is ${post.feeling.emoji} feeling ${post.feeling.label}` : "";
  article.append(
    el("div", { class: "row post-head" }, [
      el("div", { class: "user-profile" }, [
        avatarButton(author),
        el("div", {}, [
          el("p", {}, [
            authorLink(author),
            feeling ? el("span", { class: "feeling-inline" }, [feeling]) : null,
          ]),
          el("small", {}, [`${timeAgo(post.createdAt)}${post.updatedAt !== post.createdAt ? " · Edited" : ""} · ${post.audience === "public" ? "Public" : "Friends"}`]),
        ]),
      ]),
      moreBtn,
    ])
  );

  if (post.text) article.append(el("p", { class: "post-text" }, [post.text]));
  if (post.image) article.append(el("img", { class: "post-image", src: post.image, alt: `${author?.name || "User"} post image` }));
  if (post.sharedFrom) article.append(renderEmbeddedPost(post));

  const stats = el("div", { class: "post-stats" });
  if (summary.total) {
    stats.append(
      el("div", { class: "reaction-pills" }, [
        ...summary.top.map((item) => el("span", { title: item.label }, [item.emoji])),
        el("span", {}, [formatCount(summary.total)]),
      ])
    );
  } else stats.append(el("span", {}, [""]));
  stats.append(el("div", { class: "post-stat-links" }, [
    el("span", {}, [`${formatCount(post.comments.length)} comments`]),
    el("span", {}, [`${formatCount(post.shares.length)} shares`]),
  ]));
  article.append(stats);

  const picker = el("div", { class: "reaction-picker", role: "menu", "aria-label": "Choose a reaction" }, REACTIONS.map((item) => {
    const btn = el("button", { type: "button", title: item.label, "aria-label": item.label }, [item.emoji]);
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      store.reactToPost(post.id, item.id);
    });
    return btn;
  }));

  const likeBtn = el("button", {
    class: `post-action ${myReaction ? "is-active" : ""}`,
    type: "button",
    "aria-pressed": String(Boolean(myReaction)),
  }, [
    el("img", { src: myReaction ? "/facebook/like-blue.png" : "/facebook/like.png", alt: "" }),
    el("span", {}, [myReaction ? reactionMeta(myReaction).label : "Like"]),
  ]);
  likeBtn.addEventListener("click", () => store.reactToPost(post.id, myReaction || "like"));
  likeBtn.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    picker.classList.add("open");
  });
  let hoverTimer;
  likeBtn.addEventListener("mouseenter", () => {
    hoverTimer = setTimeout(() => picker.classList.add("open"), 380);
  });
  likeBtn.addEventListener("mouseleave", () => clearTimeout(hoverTimer));
  picker.addEventListener("mouseleave", () => picker.classList.remove("open"));

  const commentsWrap = el("div", { class: "comments-wrap" });
  const commentField = el("input", {
    type: "text",
    class: "comment-input",
    placeholder: "Write a comment…",
    "aria-label": "Write a comment",
  });
  const submitComment = () => {
    try {
      store.addComment(post.id, commentField.value);
      commentField.value = "";
    } catch (error) {
      showToast(error.message, "error");
    }
  };
  commentField.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitComment();
    }
  });
  commentsWrap.append(
    ...post.comments.map((comment) => commentRow(post, comment)),
    el("div", { class: "comment-composer" }, [
      avatarButton(me, "sm"),
      commentField,
      el("button", { class: "btn btn-primary sm", type: "button", onclick: submitComment }, ["Comment"]),
    ])
  );

  const commentBtn = el("button", { class: "post-action", type: "button" }, [
    el("img", { src: "/facebook/comments.png", alt: "" }),
    el("span", {}, ["Comment"]),
  ]);
  commentBtn.addEventListener("click", () => {
    commentsWrap.classList.add("open");
    commentField.focus();
  });

  const shareBtn = el("button", { class: "post-action", type: "button" }, [
    el("img", { src: "/facebook/share.png", alt: "" }),
    el("span", {}, ["Share"]),
  ]);
  shareBtn.addEventListener("click", () => {
    const textarea = el("textarea", { class: "composer-input", rows: "3", placeholder: "Say something about this…" });
    showModal({
      title: "Share post",
      content: el("div", {}, [
        textarea,
        post.sharedFrom || post.image || post.text
          ? el("p", { class: "modal-copy" }, ["This will appear at the top of your feed."])
          : null,
      ]),
      actions: [
        { label: "Cancel" },
        {
          label: "Share now",
          primary: true,
          onClick: () => {
            store.sharePost(post.id, textarea.value);
            showToast("Post shared to your feed.");
            onChange?.();
          },
        },
      ],
    });
  });

  const actions = el("div", { class: "post-actions" }, [
    el("div", { class: "reaction-wrap" }, [likeBtn, picker]),
    commentBtn,
    shareBtn,
  ]);
  article.append(actions, commentsWrap);
  if (post.comments.length) commentsWrap.classList.add("open");
  return article;
}

function editPost(post) {
  const textarea = el("textarea", { class: "composer-input", rows: "4" });
  textarea.value = post.text || "";
  let nextImage = post.image;
  const preview = el("div", { class: "composer-preview" });
  const drawPreview = () => {
    preview.replaceChildren();
    if (nextImage) {
      preview.append(
        el("img", { src: nextImage, alt: "Post image" }),
        el("button", {
          class: "icon-btn preview-remove",
          type: "button",
          "aria-label": "Remove image",
          onclick: () => { nextImage = null; drawPreview(); },
        }, ["×"])
      );
    }
  };
  drawPreview();
  const file = el("input", { type: "file", accept: "image/*", class: "sr-only" });
  file.addEventListener("change", async () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    nextImage = await fileToDataUrl(chosen);
    drawPreview();
  });
  showModal({
    title: "Edit post",
    content: el("div", {}, [
      textarea,
      preview,
      file,
      el("button", { class: "btn btn-ghost", type: "button", onclick: () => file.click() }, ["Change photo"]),
    ]),
    actions: [
      { label: "Cancel" },
      {
        label: "Save",
        primary: true,
        onClick: () => {
          store.updatePost(post.id, { text: textarea.value, image: nextImage });
          showToast("Post updated.");
        },
      },
    ],
  });
}

export function renderPostList(posts, emptyText = "No posts to show yet.") {
  if (!posts.length) {
    return el("div", { class: "empty-card" }, [
      el("h3", {}, ["Nothing here yet"]),
      el("p", {}, [emptyText]),
    ]);
  }
  const wrap = el("div", { class: "post-list" });
  posts.forEach((post) => wrap.append(renderPost(post)));
  return wrap;
}

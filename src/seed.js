import { hashPassword, uid } from "./utils.js";

const hour = 60 * 60 * 1000;
const day = 24 * hour;

export const DEMO_PASSWORD = "faizan";

export async function createSeedState() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const now = Date.now();

  const users = [
    {
      id: "u_rehan",
      name: "Faizan",
      email: "faizan@connect.app",
      passwordHash,
      avatar: "/facebook/profile-pic.png",
      cover: "/facebook/cover.png",
      bio: "Building things on the web. Coffee, code, and weekend cricket.",
      location: "Hyderabad, India",
      workplace: "Full Stack Developer",
      education: "Computer Science",
      joinedAt: now - 400 * day,
      friendIds: ["u_dhrati", "u_izhar", "u_shrilekha"],
      requestIds: ["u_nate"],
    },
    {
      id: "u_dhrati",
      name: "Dhrati Thepadia",
      email: "dhrati@connect.app",
      passwordHash,
      avatar: "/facebook/member-1.png",
      cover: "/facebook/status-2.png",
      bio: "Designer who still writes CSS by hand.",
      location: "Mumbai, India",
      workplace: "Product Design",
      education: "Visual Communication",
      joinedAt: now - 380 * day,
      friendIds: ["u_rehan", "u_shrilekha", "u_aisha"],
      requestIds: [],
    },
    {
      id: "u_izhar",
      name: "Izhar Ahmed",
      email: "izhar@connect.app",
      passwordHash,
      avatar: "/facebook/member-2.png",
      cover: "/facebook/status-3.png",
      bio: "Frontend engineer. Always learning something new.",
      location: "Bengaluru, India",
      workplace: "Web Development",
      education: "Information Technology",
      joinedAt: now - 360 * day,
      friendIds: ["u_rehan", "u_nate"],
      requestIds: [],
    },
    {
      id: "u_shrilekha",
      name: "Shrilekha Rao",
      email: "shrilekha@connect.app",
      passwordHash,
      avatar: "/facebook/member-3.png",
      cover: "/facebook/status-4.png",
      bio: "QA lead. If it can break, I will find it.",
      location: "Pune, India",
      workplace: "Software Testing",
      education: "Electronics",
      joinedAt: now - 340 * day,
      friendIds: ["u_rehan", "u_dhrati"],
      requestIds: [],
    },
    {
      id: "u_aisha",
      name: "Aisha Rahman",
      email: "aisha@connect.app",
      passwordHash,
      avatar: "/facebook/member-4.png",
      cover: "/facebook/status-5.png",
      bio: "Community events, photography, and late-night playlists.",
      location: "Delhi, India",
      workplace: "Community Manager",
      education: "Media Studies",
      joinedAt: now - 300 * day,
      friendIds: ["u_dhrati"],
      requestIds: [],
    },
    {
      id: "u_nate",
      name: "Nate Cole",
      email: "nate@connect.app",
      passwordHash,
      avatar: "/facebook/member-9.png",
      cover: "/facebook/feed-image-1.png",
      bio: "I test APIs so you do not have to.",
      location: "Austin, USA",
      workplace: "Backend Engineering",
      education: "Computer Engineering",
      joinedAt: now - 220 * day,
      friendIds: ["u_izhar"],
      requestIds: [],
    },
  ];

  const posts = [
    {
      id: "p_1",
      authorId: "u_rehan",
      text: "Shipped a new layout for the community board today. Small spacing tweaks, big difference.",
      image: "/facebook/feed-image-3.png",
      feeling: { id: "working", label: "working", emoji: "💻" },
      audience: "public",
      createdAt: now - 3 * hour,
      updatedAt: now - 3 * hour,
      reactions: { u_dhrati: "love", u_izhar: "like", u_shrilekha: "wow" },
      comments: [
        {
          id: "c_1",
          authorId: "u_dhrati",
          text: "The hierarchy looks so much cleaner. Love the card contrast.",
          createdAt: now - 2.4 * hour,
          likes: ["u_rehan", "u_izhar"],
        },
        {
          id: "c_2",
          authorId: "u_izhar",
          text: "Ship it. We can polish the empty states next.",
          createdAt: now - 2 * hour,
          likes: ["u_rehan"],
        },
      ],
      shares: ["u_dhrati"],
      savedBy: ["u_izhar"],
    },
    {
      id: "p_2",
      authorId: "u_dhrati",
      text: "Color studies from this week's workshop. Which palette would you ship?",
      image: "/facebook/feed-image-2.png",
      feeling: { id: "excited", label: "excited", emoji: "🎉" },
      audience: "public",
      createdAt: now - 9 * hour,
      updatedAt: now - 9 * hour,
      reactions: { u_rehan: "like", u_aisha: "love", u_shrilekha: "like" },
      comments: [
        {
          id: "c_3",
          authorId: "u_aisha",
          text: "The warmer one. It feels more welcoming for a social feed.",
          createdAt: now - 8 * hour,
          likes: ["u_dhrati"],
        },
      ],
      shares: [],
      savedBy: ["u_rehan"],
    },
    {
      id: "p_3",
      authorId: "u_izhar",
      text: "Reminder: accessibility is not a polish pass. Labels, focus rings, and keyboard paths belong in v1.",
      image: "/facebook/feed-image-1.png",
      audience: "public",
      createdAt: now - 26 * hour,
      updatedAt: now - 26 * hour,
      reactions: { u_rehan: "like", u_shrilekha: "love", u_nate: "like" },
      comments: [],
      shares: ["u_rehan"],
      savedBy: [],
    },
    {
      id: "p_4",
      authorId: "u_shrilekha",
      text: "Found three broken buttons in a 'production-ready' demo this morning. If it looks clickable, it should do something.",
      image: "/facebook/feed-image-4.png",
      audience: "public",
      createdAt: now - 2 * day,
      updatedAt: now - 2 * day,
      reactions: { u_rehan: "haha", u_dhrati: "like", u_izhar: "wow" },
      comments: [
        {
          id: "c_4",
          authorId: "u_rehan",
          text: "Guilty. We are fixing that this week.",
          createdAt: now - 2 * day + hour,
          likes: ["u_shrilekha"],
        },
      ],
      shares: [],
      savedBy: ["u_dhrati"],
    },
    {
      id: "p_5",
      authorId: "u_aisha",
      text: "Hitech City meetup photos are in. Thank you to everyone who showed up and stayed through the rain.",
      image: "/facebook/feed-image-5.png",
      feeling: { id: "thankful", label: "thankful", emoji: "💛" },
      audience: "public",
      createdAt: now - 4 * day,
      updatedAt: now - 4 * day,
      reactions: { u_dhrati: "love", u_rehan: "like" },
      comments: [],
      shares: [],
      savedBy: [],
    },
  ];

  const stories = [
    { id: "s_rehan", userId: "u_rehan", image: "/facebook/status-1.png", createdAt: now - 2 * hour, viewers: ["u_dhrati"] },
    { id: "s_dhrati", userId: "u_dhrati", image: "/facebook/status-2.png", createdAt: now - 4 * hour, viewers: [] },
    { id: "s_izhar", userId: "u_izhar", image: "/facebook/status-3.png", createdAt: now - 6 * hour, viewers: ["u_rehan"] },
    { id: "s_shrilekha", userId: "u_shrilekha", image: "/facebook/status-4.png", createdAt: now - 8 * hour, viewers: [] },
    { id: "s_aisha", userId: "u_aisha", image: "/facebook/status-5.png", createdAt: now - 10 * hour, viewers: [] },
  ];

  const conversations = [
    {
      id: "m_rehan_dhrati",
      participantIds: ["u_rehan", "u_dhrati"],
      messages: [
        { id: uid("msg"), senderId: "u_dhrati", text: "The new feed cards look great.", createdAt: now - 5 * hour, readBy: ["u_dhrati", "u_rehan"] },
        { id: uid("msg"), senderId: "u_rehan", text: "Thanks — still tweaking the composer on mobile.", createdAt: now - 4.6 * hour, readBy: ["u_rehan", "u_dhrati"] },
        { id: uid("msg"), senderId: "u_dhrati", text: "Want to review the profile header together later?", createdAt: now - 40 * 60 * 1000, readBy: ["u_dhrati"] },
      ],
    },
    {
      id: "m_rehan_izhar",
      participantIds: ["u_rehan", "u_izhar"],
      messages: [
        { id: uid("msg"), senderId: "u_izhar", text: "I added focus states to the sidebar links.", createdAt: now - day, readBy: ["u_izhar", "u_rehan"] },
        { id: uid("msg"), senderId: "u_rehan", text: "Perfect. Let's keep the blue from the original nav.", createdAt: now - 20 * hour, readBy: ["u_rehan", "u_izhar"] },
      ],
    },
    {
      id: "m_rehan_shrilekha",
      participantIds: ["u_rehan", "u_shrilekha"],
      messages: [
        { id: uid("msg"), senderId: "u_shrilekha", text: "Can you add empty states to notifications?", createdAt: now - 2 * day, readBy: ["u_shrilekha"] },
      ],
    },
  ];

  const notifications = [
    {
      id: "n_1",
      userId: "u_rehan",
      type: "comment",
      fromId: "u_dhrati",
      postId: "p_1",
      text: "commented on your post",
      createdAt: now - 2.4 * hour,
      read: false,
    },
    {
      id: "n_2",
      userId: "u_rehan",
      type: "reaction",
      fromId: "u_izhar",
      postId: "p_1",
      text: "liked your post",
      createdAt: now - 2.8 * hour,
      read: false,
    },
    {
      id: "n_3",
      userId: "u_rehan",
      type: "friend",
      fromId: "u_nate",
      text: "sent you a friend request",
      createdAt: now - 8 * hour,
      read: false,
    },
    {
      id: "n_4",
      userId: "u_rehan",
      type: "share",
      fromId: "u_dhrati",
      postId: "p_1",
      text: "shared your post",
      createdAt: now - day,
      read: true,
    },
    {
      id: "n_5",
      userId: "u_dhrati",
      type: "reaction",
      fromId: "u_rehan",
      postId: "p_2",
      text: "liked your post",
      createdAt: now - 8 * hour,
      read: false,
    },
  ];

  const events = [
    { id: "e_1", title: "Social Media Meetup", place: "Hitech City", date: "March 18", day: "18", month: "March", description: "Talks on community products and feed design." },
    { id: "e_2", title: "Frontend Lab", place: "Hitech City", date: "April 14", day: "14", month: "April", description: "Live coding, accessibility, and UI critique." },
  ];

  const groups = [
    { id: "g_1", name: "Web Development", image: "/facebook/shortcut-1.png", members: 1284, about: "HTML, CSS, JS, and everything in between." },
    { id: "g_2", name: "Web Design", image: "/facebook/shortcut-2.png", members: 867, about: "Visual systems, type, and social UI patterns." },
    { id: "g_3", name: "Full Stack Development", image: "/facebook/shortcut-3.png", members: 2103, about: "APIs, databases, and shipping complete apps." },
    { id: "g_4", name: "Testing", image: "/facebook/shortcut-4.png", members: 542, about: "QA, automation, and breaking things on purpose." },
  ];

  const listings = [
    { id: "l_1", title: "Mechanical keyboard", price: "$48", image: "/facebook/photo1.png", sellerId: "u_izhar" },
    { id: "l_2", title: "Desk lamp", price: "$16", image: "/facebook/photo2.png", sellerId: "u_dhrati" },
    { id: "l_3", title: "Monitor stand", price: "$22", image: "/facebook/photo3.png", sellerId: "u_nate" },
    { id: "l_4", title: "Plant set", price: "$12", image: "/facebook/photo4.png", sellerId: "u_aisha" },
  ];

  const watchItems = [
    { id: "w_1", title: "Building a feed in a weekend", image: "/facebook/photo5.png", authorId: "u_izhar" },
    { id: "w_2", title: "Color systems for social apps", image: "/facebook/photo6.png", authorId: "u_dhrati" },
  ];

  const news = [
    { id: "news_1", title: "Community guidelines refresh", source: "Connect News", image: "/facebook/news.png", body: "A clearer set of rules for posts, comments, and messages." },
    { id: "news_2", title: "Stories get progress indicators", source: "Product", image: "/facebook/watch.png", body: "Story viewer now supports keyboard navigation and viewed state." },
  ];

  return {
    version: 1,
    users,
    posts,
    stories,
    conversations,
    notifications,
    events,
    groups,
    listings,
    watchItems,
    news,
    joinedGroupIds: { u_rehan: ["g_1", "g_3"] },
    savedListingIds: {},
    settings: {
      u_rehan: { theme: "light", hideChat: false, hideAd: false, compactMode: false },
    },
    drafts: { post: "", feeling: null, image: null },
    session: null,
  };
}

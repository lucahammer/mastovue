// parse a Link header by https://gist.github.com/deiu/9335803
//
// Link:<https://example.org/.meta>; rel=meta
//
// var r = parseLinkHeader(xhr.getResponseHeader('Link');
// r['meta'] outputs https://example.org/.meta
//
function parseLinkHeader(header) {
  if (!header) return "";
  var linkexp =
    /<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g;
  var paramexp =
    /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g;

  var matches = header.match(linkexp);
  var rels = {};
  for (var i = 0; i < matches.length; i++) {
    var split = matches[i].split(">");
    var href = split[0].substring(1);
    var ps = split[1];
    var s = ps.match(paramexp);
    for (var j = 0; j < s.length; j++) {
      var p = s[j];
      var paramsplit = p.split("=");
      var name = paramsplit[0];
      var rel = paramsplit[1].replace(/["']/g, "");
      rels[rel] = href;
    }
  }
  return rels;
}

//https://stackoverflow.com/questions/21626177/word-frequency-count-fix-a-bug-with-standard-property
function count(arr) {
  return arr.reduce(function (m, e) {
    m[e] = (+m[e] || 0) + 1;
    return m;
  }, {});
}

// Routing
const Foo = { template: "" };
const routes = [
  { path: "/:instance/", component: Foo },
  { path: "/:instance/:local/", component: Foo },
  { path: "/:instance/:local/:hashtag/", component: Foo },
];
const router = new VueRouter({
  routes,
});

var app = new Vue({
  router,
  el: "#vue",
  data: {
    tootCount: 40,
    placeholder: "vis.social",
    inputUrl: "",
    toots: [],
    nextUrl: "",
    loading: false,
    loaded: false,
    inputTag: "",
    placeholderTag: "mastodon",
    local: "true",
    showInfo: true,
  },
  computed: {
    instance: function () {
      if (this.inputUrl.includes("http")) {
        let location = new URL(this.inputUrl);
        return location.hostname;
      } else if (this.inputUrl != "") {
        return this.inputUrl;
      } else {
        this.inputUrl = this.placeholder;
        return this.placeholder;
      }
    },
    tag: function () {
      if (this.inputTag.includes("#")) {
        return this.inputTag.replace("#", "");
      } else if (this.inputTag == "") {
        this.inputTag = this.placeholderTag;
        return this.placeholderTag;
      } else return this.inputTag;
    },
    users: function () {
      let allUsers = [];
      this.toots.forEach(function (toot) {
        allUsers.push(toot.account.acct);
      });
      var countedUsers = count(allUsers);
      //https://stackoverflow.com/questions/1069666/sorting-javascript-object-by-property-value
      return Object.keys(countedUsers)
        .sort((a, b) => countedUsers[b] - countedUsers[a])
        .reduce(
          (_sortedObj, key) => ({
            ..._sortedObj,
            [key]: countedUsers[key],
          }),
          {}
        );
    },
    localAsText: function () {
      if (this.local == "true") return "local";
      else return "federated";
    },
  },
  methods: {
    showTimeline: function () {
      this.loaded = false;
      if (this.inputUrl == "") this.inputUrl = this.placeholder;
      this.toots = [];
      this.updateLocation();
      this.nextUrl =
        "https://" +
        this.instance +
        "/api/v1/timelines/public?local=" +
        this.local +
        "&limit=40";
      this.loadToots();
    },
    showTag: function () {
      this.loaded = false;
      if (this.inputTag == "") this.inputTag = this.placeholderTag;
      this.toots = [];
      this.updateLocation("tag");
      this.nextUrl =
        "https://" +
        this.instance +
        "/api/v1/timelines/tag/" +
        this.tag +
        "?local=" +
        this.local +
        "&limit=40";
      console.log(this.nextUrl);
      this.loadToots();
    },
    loadToots: function () {
      this.loading = true;
      if (!this.nextUrl) this.nextUrl = this.instance;
      axios.get(this.nextUrl).then((response) => {
        this.toots = this.toots.concat(response.data);
        this.nextUrl = parseLinkHeader(response.headers.link).next;
        this.loading = false;
        this.loaded = true;
        if (this.toots.length < this.tootCount && this.nextUrl)
          this.loadToots();
      });
    },
    formatDate: function (date) {
      return moment(date).fromNow();
    },
    updateLocation: function (kind) {
      if (kind == "tag")
        router.push({
          path: `/${this.instance}/${this.localAsText}/${this.tag}`,
        });
      else router.push({ path: `/${this.instance}/${this.localAsText}/` });
    },
  },
  watch: {
    $route(to, from) {
      if (to.query.count) {
        this.tootCount = parseInt(to.query.count);
        if (this.toots.length < this.tootCount && this.nextUrl)
          this.loadToots();
      }
    },
  },
  mounted: function () {
    if (this.$route.params.instance)
      this.inputUrl = this.$route.params.instance;
    if (this.$route.query.count) console.log(this.$route.params.count);
    this.tootCount = parseInt(this.$route.query.count);
    if (this.$route.params.local == "federated") this.local = false;
    if (this.$route.params.hashtag) {
      this.inputTag = this.$route.params.hashtag;
      this.showTag();
    } else if (this.$route.params.instance) this.showTimeline();
  },
});

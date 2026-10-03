/**
 * Public record for the SEAtrails partnership page.
 *
 * SEAtrails (2000– ) is the regional, community-designated trail system tied
 * together by the Alaska Marine Highway. The archive Southeast Conference
 * still hosts is https://akseatrails.org/. The hostname seatrails.org was
 * checked on 2026-10-03 and serves an unrelated commercial site. Nothing in
 * this module may link it.
 */

const ARCHIVE = "https://akseatrails.org";

function guide(slug: string): string {
  return `${ARCHIVE}/${slug}/`;
}

function resolution(file: string): string {
  return `${ARCHIVE}/files/resolutions/${encodeURIComponent(file)}`;
}

export const SEATRAILS = {
  name: "SEAtrails",
  founded: 2000,
  materialsAcquiredYear: 2022,
  /** Checked this date. Do not link. */
  lostDomain: "seatrails.org",
  lostDomainChecked: "2026-10-03",
  archiveUrl: `${ARCHIVE}/`,
  historyUrl: `${ARCHIVE}/the-history-of-seatrails/`,
  communitiesUrl: `${ARCHIVE}/member-communities/`,
  aboutUrl: `${ARCHIVE}/about/`,
  ketchikanGuideUrl: guide("ketchikan-alaska-trails-and-adventure-travel-guide"),
  resolutionTemplateUrl: `${ARCHIVE}/files/pdf/resolution.doc`,
  nominationFormUrl: `${ARCHIVE}/files/pdf/trail_nomination.pdf`,
  conferenceUrl: "https://seconference.org/program/seatrails/",
  marineHighwayNote:
    "The Alaska Marine Highway, an All-American Road, was the link between the towns.",
} as const;

export type SeaTrailsCommunity = {
  name: string;
  /** This site's map covers trails in this community. */
  home: boolean;
  guideUrl: string;
  resolutionUrl: string;
  note?: string;
};

export const communities: readonly SeaTrailsCommunity[] = [
  {
    name: "Angoon",
    home: false,
    guideUrl: guide("angoon-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("angoon.pdf"),
  },
  {
    name: "Coffman Cove",
    home: false,
    guideUrl: guide("coffmancove-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("coffman cove.pdf"),
  },
  {
    name: "Craig",
    home: false,
    guideUrl: guide("craig-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("craig.pdf"),
  },
  {
    name: "Gustavus",
    home: false,
    guideUrl: guide("gustavus-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("gustavus.pdf"),
  },
  {
    name: "Haines",
    home: false,
    guideUrl: guide("haines-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("haines.pdf"),
  },
  {
    name: "Hoonah",
    home: false,
    guideUrl: guide("hoonah-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("hoonah.pdf"),
    note: "The destinations page still says feature links would follow community meetings, assessment, and mapping.",
  },
  {
    name: "Hydaburg",
    home: false,
    guideUrl: guide("hydaburg-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("hydaburg.pdf"),
  },
  {
    name: "Juneau",
    home: false,
    guideUrl: guide("juneau-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("juneau.pdf"),
  },
  {
    name: "Kake",
    home: false,
    guideUrl: guide("kake-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("kake.pdf"),
  },
  {
    name: "Ketchikan",
    home: true,
    guideUrl: guide("ketchikan-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("ketchikan.pdf"),
    note: "Where this map starts. The old resolution is not a current endorsement of this group. The archive calls Ketchikan the connection point for Prince of Wales, via the Inter-Island Ferry to Hollis.",
  },
  {
    name: "Naukati",
    home: false,
    guideUrl: guide("naukati-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("naukati west.pdf"),
  },
  {
    name: "Pelican",
    home: false,
    guideUrl: guide("pelican-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("pelican.pdf"),
  },
  {
    name: "Petersburg",
    home: false,
    guideUrl: guide("petersburg-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("petersburg.pdf"),
  },
  {
    name: "Sitka",
    home: false,
    guideUrl: guide("sitka-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("sitka.pdf"),
  },
  {
    name: "Skagway",
    home: false,
    guideUrl: guide("skagway-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("skagway.pdf"),
  },
  {
    name: "Thorne Bay",
    home: false,
    guideUrl: guide("thorne-bay-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("thorne bay.pdf"),
  },
  {
    name: "Whale Pass",
    home: false,
    guideUrl: guide("whale-pass-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("whale pass.pdf"),
  },
  {
    name: "Wrangell",
    home: false,
    guideUrl: guide("wrangell-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("wrangell.pdf"),
  },
  {
    name: "Yakutat",
    home: false,
    guideUrl: guide("yakutat-alaska-trails-and-adventure-travel-guide"),
    resolutionUrl: resolution("yakutat.pdf"),
  },
];

export type KetchikanRoute = {
  /** Name used on this site, or the archive name when we have no segment. */
  name: string;
  /** Wording on the Ketchikan page of the archive. */
  archiveName: string;
  /** Named in the old guide's list of Ketchikan trails, as opposed to the marine route mentioned alongside it. */
  inGuideList: boolean;
  /** This site has a page or corridor for it. */
  onMap: boolean;
  href: string | null;
  note: string;
};

export const ketchikanRoutes: readonly KetchikanRoute[] = [
  {
    name: "Ward Creek",
    archiveName: "Ward Creek Trail",
    inGuideList: true,
    onMap: true,
    href: "/network/ward-creek",
    note: "Flat gravel along the creek. On this map it is the built start of the run north toward Lunch Creek.",
  },
  {
    name: "Perseverance Trail",
    archiveName: "Perseverance Lake Trail",
    inGuideList: true,
    onMap: true,
    href: "/network/perseverance-trail",
    note: "Listed as a destination in the old guide. On this map the tread is marked needs-work.",
  },
  {
    name: "Dude Mountain",
    archiveName: "Dude Mountain Trail",
    inGuideList: true,
    onMap: true,
    href: "/network/dude-mountain",
    note: "Alpine above the north end of the road system.",
  },
  {
    name: "Deer Mountain to Silvis Lake",
    archiveName: "Deer Mountain and Silvas Lake Trail",
    inGuideList: true,
    onMap: true,
    href: "/network?corridor=deer-mountain-to-silvis",
    note: "The old guide spells the lake Silvas. The Forest Service spelling, and this map, use Silvis. The ridge between them is still a proposed line.",
  },
  {
    name: "Connell Lake",
    archiveName: "Connell Lake Trail",
    inGuideList: true,
    onMap: true,
    href: "/network/connell-lake",
    note: "Walkable today, and a dead end until it links to Ward Creek and Lunch Creek.",
  },
  {
    name: "Mountain Point",
    archiveName: "Mountain Point Underwater Trail",
    inGuideList: true,
    onMap: false,
    href: null,
    note: "A scuba site. This map is tread you can walk, so it stays in the archive and off the network.",
  },
  {
    name: "Revillagigedo Island marine route",
    archiveName: "Revillagigedo Island Marine Route",
    inGuideList: false,
    onMap: false,
    href: null,
    note: "A saltwater route around the island. The old master plan calls it about 150 miles. It is not a line on this foot-trail map.",
  },
];

export function guideTrailsOnMap(): KetchikanRoute[] {
  return ketchikanRoutes.filter((route) => route.inGuideList && route.onMap);
}

export function guideTrails(): KetchikanRoute[] {
  return ketchikanRoutes.filter((route) => route.inGuideList);
}

/** Every URL this module publishes. Used to keep the lost domain unlinked. */
export function publishedUrls(): string[] {
  const urls: string[] = [
    SEATRAILS.archiveUrl,
    SEATRAILS.historyUrl,
    SEATRAILS.communitiesUrl,
    SEATRAILS.aboutUrl,
    SEATRAILS.ketchikanGuideUrl,
    SEATRAILS.resolutionTemplateUrl,
    SEATRAILS.nominationFormUrl,
    SEATRAILS.conferenceUrl,
  ];
  for (const community of communities) {
    urls.push(community.guideUrl, community.resolutionUrl);
  }
  for (const route of ketchikanRoutes) {
    if (route.href) urls.push(route.href);
  }
  return urls;
}

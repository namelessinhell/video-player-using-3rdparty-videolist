export const CAT_LIST = {
    "20": "电影",
    "22": "冒险片",
    "24": "剧情片",
    "26": "动作片",
    "28": "动画电影",
    "32": "喜剧片",
    "34": "奇幻片",
    "36": "恐怖片",
    "38": "悬疑片",
    "40": "惊悚片",
    "42": "歌舞片",
    "44": "灾难片",
    "46": "爱情片",
    "48": "科幻片",
    "50": "犯罪片",
    "52": "经典片",
    "54": "网络电影",
    "56": "战争片",
    "60": "电视剧",
    "62": "欧美剧",
    "64": "日剧",
    "66": "韩剧",
    "68": "台剧",
    "70": "泰剧",
    "72": "国产剧",
    "74": "港剧",
    "76": "新马剧",
    "78": "其他剧",
    "80": "动漫",
    "82": "综艺",
    "86": "纪录片",
    "96": "欧美动漫",
    "98": "日韩动漫",
    "100": "国产动漫",
    "102": "新马泰动漫",
    "104": "港台动漫",
    "106": "其他动漫",
    "108": "国产综艺",
    "110": "日韩综艺",
    "112": "欧美综艺",
    "114": "新马泰综艺",
    "116": "港台综艺",
    "118": "其他综艺",
    "120": "短剧",
    "122": "预告片"
  }

  export const CATEGORY_GROUPS = {
    "电影": ["20", "22", "24", "26", "28", "32", "34", "36", "38", "40", "42", "44", "46", "48", "50", "52", "54", "56"],
    "电视剧": ["60", "62", "64", "66", "68", "70", "72", "74", "76", "78"],
    "动漫": ["80", "96", "98", "100", "102", "104", "106"],
    "综艺": ["82", "108", "110", "112", "114", "116", "118"],
    "其他": ["86", "120", "122"]
  }

  export function getCategoryName(id) {
    return CAT_LIST[id] || "未知分类"
  }
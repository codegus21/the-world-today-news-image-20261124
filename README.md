# the-world-today-news-image-20261124

[![make.fun · news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/codegus21/the-world-today-news-image-20261124/rank.svg)](https://make.fun/bounty/news-image-20261124/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/codegus21/the-world-today-news-image-20261124/reward.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)

Sum up 24 November's world news in one image.

A newspaper front page drawn entirely in code: a pixel buffer, a hand-built 5x7 bitmap font, and a hand-rolled PNG encoder (zlib deflate + manual PNG chunks). It leads with Nvidia reinstating Jensen Huang as chief executive after pressure from President Trump — shares up 31% in a day — and carries 33 stories in 8 sections across every region: Ukraine sinking a Russian corvette off Libya, three tankers hit by mines in the Strait of Hormuz, Israeli strikes in Gaza, the Democrats' record House win, the EU's 22nd sanctions package, Seoul paying $375,000 to catch AI exam cheats, and the S&P 500 jumping 4.73%. The program draws a 1024x1024 PNG (about 32 KB) with the same bytes on every run.

## Run it

```sh
node main.ts
```

`main.ts` draws the front page and writes it to `/output/entry.png`. Outside a container, `MAKEFUN_OUTPUT_DIR` stands in for `/output`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=jg0j15t7&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124) · AI agents build software for cash rewards</sub>

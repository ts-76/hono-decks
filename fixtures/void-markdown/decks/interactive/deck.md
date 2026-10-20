<script>
import Counter from "./Counter.tsx" with { island: "load" };
import Later from "./Counter.tsx" with { island: "visible" };
import Idle from "./Counter.tsx" with { island: "idle" };
import Media from "./Counter.tsx" with { island: "media:(min-width: 700px)" };
</script>
---
title: Interactive Markdown
---
# Interactive first slide

<Counter label="first" initial="2" />
<Counter label="second" initial="7" />
<Idle label="idle" />
<Media label="media" />

---
title: Second interactive slide
---
# Interactive second slide

<Later label="visible" initial="4" />

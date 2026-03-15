Aspect Ratio (Prev-04)
This seems to work although 16:9 is quite small but ratio is correct, a zoom feature would be good or a fit screen. Free works perfectly.

Fullscreen (Prev-05)
Maximize icon does not work properly. it goes to top of the page and much smaller i.e. no full screen. I have provided a screenshot of it in @feedback/screenshots/screenshot-01.png. I've also added @screenshot-02.png to show free. This looks good. 

escape works. 

Suggestions:
1. Maybe we can have the scroll control zooming in and out with ease. Also attach to mouse scroll, this would be good for testing.
Not sure if record is supposed to be working yet, but it doesn't seem to be fully working yet. I presume we haven't come to this part yet.

---

## Timeline — Loop Region (Ableton-style)
Currently LOOP wraps the full sequence. A future version should support a draggable loop region:
- Mark In / Mark Out points that are easily draggable (like Ableton Live's loop brace)
- Only the selected region loops during playback
- Reference: Ableton loop selector — both ends draggable, region highlighted
- See feedback/screenshots/AbletonLoop.png

## Timeline — Cavalry-style Playhead Architecture
Implement a Cavalry-like timeline where:
- The playhead at the current frame/time drives all procedural animation
- Clips/keybars limit layer visibility (layers are only active within their clip range)
- Behaviors offset and scale time from the composition Time input
- Full scrubbing, markers, and keyframing of attributes supported
- This is the intended long-term architecture for multi-lane parameter control

## Recording — Design Clarification
The viewport scrub handle (vertical bar, right side) should act as the traditional "scroll position" input — like a webpage scrollbar.
- During recording: dragging the scrub handle captures scroll position as keyframes over time
- The timeline below should represent automation curves, not a video timeline
- A possible future addition: a separate play button on the scrub handle track itself
# Privacy Prediction Platform - Video Production Guide

## Overview

This document provides step-by-step guidance for producing the 1-minute video demonstration for the Privacy Prediction Platform submission.

## Quick Reference

- **Duration:** Exactly 60 seconds
- **Script File:** `VIDEO_SCRIPT.md` (with detailed visual directions)
- **Narration File:** `VIDEO_NARRATION` (spoken content only)
- **Total Word Count:** ~480 words (approximately 60 seconds at normal speaking pace)

## Files & Resources

### Primary Files
1. **VIDEO_SCRIPT.md** - Complete script with scene descriptions, visual directions, and timing
2. **VIDEO_NARRATION** - Spoken narration (no timing, no action cues, just the words)
3. **VIDEO_PRODUCTION_GUIDE.md** - This file (production guidelines)

### Assets Needed
- [ ] PrivacyPredictionPlatform repository
- [ ] Code files (contracts, tests, scripts)
- [ ] Terminal/IDE screenshots
- [ ] Zama branding (logos, colors)
- [ ] Professional screen recording software
- [ ] Video editing software

## Production Steps

### Step 1: Prepare Visual Assets (30 minutes)

1. **Code Snippets**
   - Extract `createEvent()` function from PrivacyGuess.sol
   - Extract test structure from test files
   - Use professional syntax highlighting (Monokai/Dracula theme)
   - Font: Size 16-18px for readability

2. **Terminal Recordings**
   - Open terminal with clean background
   - Use large font size (18-20pt)
   - Run actual commands:
     - `npm run create-example privacy-prediction-basic ./my-example`
     - `npm run generate-all-docs`
   - Capture authentic output

3. **File Structure Diagrams**
   - Create directory tree visualization
   - Use consistent icons for folders/files
   - Color-code different types (contracts, tests, scripts)

4. **Feature Icons**
   - Create/source icons for:
     - Encryption (🔐)
     - Access Control (👤)
     - Multi-Round (🔄)
     - Batch Operations (⚡)

5. **Branding Assets**
   - Zama logo
   - Project logo/icon
   - Color palette (Purple #7C3AED, Green #10B981)

### Step 2: Prepare Narration (15 minutes)

1. **Reading Preparation**
   - Read narration file aloud to practice
   - Target pace: 150-160 words per minute
   - Mark breathing points in the text
   - Adjust pacing for clarity

2. **Audio Recording**
   - Use professional microphone (USB condenser or better)
   - Record in quiet environment
   - Aim for clear, neutral accent
   - Speaking tone: Professional, enthusiastic, confident

3. **Recording Setup**
   - Audio bitrate: 192-256 kbps
   - Sample rate: 44.1 kHz
   - Format: WAV or AIFF (lossless)
   - Monitor levels: -18dB to -6dB

### Step 3: Screen Recording & Visual Creation (45 minutes)

**Software Options:**
- OBS Studio (free, open-source)
- Camtasia (professional, includes editing)
- ScreenFlow (Mac)
- Snagit (Windows/Mac)

**Recording Settings:**
- Resolution: 1920x1080 (Full HD)
- Frame rate: 30 fps
- Codec: H.264
- Bitrate: 8-12 Mbps

**Recording Checklist:**
- [ ] Desktop clean and organized
- [ ] Terminal ready with large font
- [ ] Code editor configured
- [ ] All applications needed are open
- [ ] Test recording first
- [ ] Record multiple takes
- [ ] Leave buffer time between scenes

### Step 4: Animation & Graphics (60 minutes)

**Tools:**
- Adobe Animate CC
- Motion Graphics templates
- Keynote/PowerPoint with animation
- Adobe After Effects (professional)
- DaVinci Resolve (free alternative)

**Key Animations:**
- Title fade-in (0.3s)
- Directory tree expansion (1.5s)
- Code typing effect (natural speed)
- Progress bars filling (0.8s)
- Checkmarks appearing (0.4s each)
- Feature cards sliding in (0.5s each)

**Graphics to Create:**
- Title card
- Project structure diagram
- Feature comparison cards
- Bounty compliance checklist
- Closing slide with links

### Step 5: Video Editing & Assembly (90 minutes)

**Software Options:**
- DaVinci Resolve (free, professional)
- Adobe Premiere Pro
- Final Cut Pro
- Shotcut (free, open-source)

**Editing Steps:**

1. **Import Assets**
   - Import narration audio
   - Import screen recordings
   - Import graphics/animations
   - Organize in timeline

2. **Synchronize Audio**
   - Place narration on timeline
   - Align visuals with narration
   - Add fade-in/fade-out for audio

3. **Add Visual Elements**
   - Insert animations between scenes
   - Add text overlays with timing
   - Incorporate progress indicators
   - Include terminal output captures

4. **Timing Adjustments**
   - Ensure total duration is exactly 60 seconds
   - Trim excess footage
   - Add transition animations (0.3-0.5s)
   - Verify audio/video sync

5. **Color Correction**
   - Maintain consistent brightness
   - Apply color grading (cool/professional look)
   - Ensure text readability on all backgrounds

6. **Effects & Transitions**
   - Fade transitions between scenes (0.3s)
   - Slide transitions for text (0.4s)
   - Cross-dissolve for smooth flow
   - Keep effects minimal and professional

### Step 6: Quality Control & Export (30 minutes)

**QA Checklist:**
- [ ] Audio is clear and audible
- [ ] Video is exactly 60 seconds
- [ ] All text is readable
- [ ] Code is properly syntax-highlighted
- [ ] Timing matches narration
- [ ] Transitions are smooth
- [ ] No spelling errors in overlays
- [ ] Zama branding is correct
- [ ] Color palette is consistent
- [ ] Frame rate is consistent (30fps)

**Export Settings:**

**For YouTube/Web:**
```
Format: MP4 (H.264)
Resolution: 1920x1080
Frame Rate: 30fps
Bitrate: 8-12 Mbps
Audio: AAC, 128 kbps, 44.1kHz
File Size: Target <20MB
```

**For Submission:**
```
Format: MP4 or WebM
Resolution: 1920x1080
Duration: 00:00:60 (exactly)
File: PrivacyGuess.mp4
```

### Step 7: Final Review & Delivery (15 minutes)

1. **Watch Complete Video**
   - Verify timing matches script
   - Check audio synchronization
   - Validate all visual elements appear
   - Confirm text readability

2. **Compare to Script**
   - Each narration point appears on screen
   - Visual timing aligns with spoken words
   - All 6 scenes are present
   - Transitions are smooth

3. **Delivery**
   - Save as `PrivacyGuess.mp4`
   - Place in repository root: `D:\\\PrivacyPredictionPlatform\`
   - Verify file size is reasonable
   - Test playback on various devices

## Scene-by-Scene Timing Guide

```
Scene 1: Title & Introduction          0:00 - 0:08 (8 sec)
Scene 2: Project Overview              0:08 - 0:16 (8 sec)
Scene 3: Smart Contracts Demo          0:16 - 0:32 (16 sec)
  - 3A: Contract Overview              0:16 - 0:20 (4 sec)
  - 3B: Prediction Lifecycle           0:20 - 0:26 (6 sec)
  - 3C: Test Coverage                  0:26 - 0:32 (6 sec)
Scene 4: Automation Tools              0:32 - 0:44 (12 sec)
  - 4A: Repository Generator           0:32 - 0:38 (6 sec)
  - 4B: Documentation Generator        0:38 - 0:44 (6 sec)
Scene 5: Key Features & Compliance     0:44 - 0:56 (12 sec)
  - 5A: FHEVM Patterns                 0:44 - 0:50 (6 sec)
  - 5B: Bounty Compliance              0:50 - 0:56 (6 sec)
Scene 6: Call to Action & Closing      0:56 - 1:00 (4 sec)

TOTAL DURATION: 1:00 (60 seconds)
```

## Recommended Tools

### Free/Open Source
- **Screen Recording:** OBS Studio
- **Video Editing:** DaVinci Resolve
- **Graphics:** GIMP, Inkscape
- **Audio Recording:** Audacity

### Professional (Paid)
- **All-in-One:** Camtasia
- **Video Editing:** Adobe Premiere Pro, Final Cut Pro
- **Motion Graphics:** Adobe After Effects
- **Screen Recording:** ScreenFlow, Snagit

## Color Scheme Reference

```
Primary Colors:
- Zama Purple: #7C3AED (RGB: 124, 58, 237)
- Accent Green: #10B981 (RGB: 16, 185, 129)
- Dark Gray: #1F2937 (RGB: 31, 41, 55)
- Bright Blue: #0EA5E9 (RGB: 14, 165, 233)

Background:
- White: #FFFFFF (for code/text)
- Dark: #0F172A (for backgrounds)

Text:
- Primary Text: #1F2937
- Secondary Text: #6B7280
- Code Background: #1E293B
- Code Text: #E2E8F0
```

## Typography Guidelines

```
Title Font: Inter Bold, 48-64px
Subtitle Font: Inter Regular, 24-32px
Body Text: Inter Regular, 16-20px
Code Font: Fira Code, 16-18px
Callout Font: Inter SemiBold, 14-18px
```

## Audio Recording Tips

1. **Before Recording**
   - Test microphone levels
   - Record 5-second silence baseline
   - Remove background noise sources
   - Close unnecessary applications

2. **During Recording**
   - Maintain consistent distance from mic
   - Speak clearly and deliberately
   - Don't rush (150-160 words/minute)
   - Pause slightly at natural breaks

3. **After Recording**
   - Listen to entire recording
   - Identify any issues
   - Re-record sections if needed
   - Normalize audio levels to -3dB

## Estimated Production Time

- Asset Preparation: 30 min
- Narration Preparation: 15 min
- Screen Recording & Graphics: 45 min
- Video Editing & Assembly: 90 min
- Quality Control & Export: 30 min
- **Total Estimated Time: ~3.5 hours**

## Troubleshooting

### Audio/Video Out of Sync
- Resync in editing software
- Re-export with same frame rate
- Verify audio wasn't trimmed

### Video Quality Issues
- Check resolution is 1920x1080
- Verify bitrate is 8-12 Mbps
- Ensure codec is H.264
- Confirm frame rate is 30fps

### Text Not Readable
- Increase font size
- Add semi-transparent background
- Use high contrast colors
- Test on small screen

### Timing Not Matching
- Count word pace (150-160 wpm)
- Trim silent sections
- Adjust animation timing
- Re-check narration delivery

## Final Checklist

Before uploading/submitting:
- [ ] Duration is exactly 60 seconds
- [ ] File format is MP4 (H.264)
- [ ] Resolution is 1920x1080
- [ ] Audio is clear and synced
- [ ] All text is readable
- [ ] Zama branding is correct
- [ ] Repository link is accurate
- [ ] File size is under 30MB
- [ ] Plays on multiple devices
- [ ] Matches VIDEO_SCRIPT.md timing

## Distribution & Hosting

**For Bounty Submission:**
- Upload to repository root as `PrivacyGuess.mp4`
- Include link in README.md under "Demo Video"
- Ensure video is publicly accessible

**Optional Distribution:**
- Upload to YouTube (unlisted or public)
- Share on Discord #announcements
- Include in GitHub release notes
- Link from project website

## Support Resources

- **DaVinci Resolve:** https://www.davinciresolve.com/
- **OBS Studio:** https://obsproject.com/
- **Camtasia:** https://www.techsmith.com/camtasia.html
- **Adobe Creative Cloud:** https://www.adobe.com/

## Version Control

- Keep all source files (Premiere project, After Effects file, etc.)
- Save multiple versions during production
- Backup final video in multiple locations
- Document any special effects or techniques used

---

**Total Production Estimate: 3.5-4 hours**

See `VIDEO_SCRIPT.md` for detailed scene descriptions and `VIDEO_NARRATION` for spoken content.

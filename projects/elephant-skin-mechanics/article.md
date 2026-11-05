---
title: Elephant Skin Mechanics
summary: Full-field strain measurement of elephant skin with digital image correlation, for insight into soft-tissue mechanics that informs biomimetic materials and robotics.
date: 2023-06
org: Georgia Tech
period: "2023"
role: Undergraduate researcher
team: Geometry of Materials Lab
tools: [Digital image correlation, Cyclic tensile testing, MATLAB]
tags: [Mechanics]
cover: dic-strain-field.gif
cover_caption: Eyy engineering strain field evolving through a loading cycle (Eulerian frame).
---

<!-- Draft carried over from the old site. Rewrite in your own words.
     The only usable image is the strain animation. The speckle and specimen
     photos are tiny (in _unused/). Add higher-resolution images if you have them. -->

## Soft-tissue mechanics

Biological soft tissues solve problems engineered materials struggle with: large reversible deformation, direction-dependent stiffness and toughness, all at once. Elephant skin is an extreme, accessible case. Characterizing how it strains under load gives the Geometry of Materials Lab a reference point for designing programmable, biomimetic materials.

## Digital image correlation

DIC tracks a high-contrast speckle pattern across video frames to reconstruct full-field displacement and strain, with nothing touching the specimen. I prepared specimens, applied speckle patterns, ran tensile tests, and processed the imagery into strain fields.

- Compared graphite-coated and speckled specimens to optimize contrast and tracking.
- Computed E<sub>yy</sub> strain fields (Eulerian and Lagrangian) and displacement maps in MATLAB.
- Ran cyclic loading to capture the tissue's hysteretic, history-dependent response.

## Results

The strain fields show strong **spatial heterogeneity**. Strain concentrates around wrinkles and structural features instead of spreading uniformly, and the response stiffens and shifts across loading cycles. This is the ground-truth data needed to validate soft-tissue constitutive models.

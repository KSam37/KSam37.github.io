---
title: Metal AM Process Characterization
summary: Mechanical characterization of additively manufactured 15-5PH stainless steel across process parameters, using DIC strain measurement and computer-vision porosity analysis.
date: 2021-08
org: UCF
period: "2021"
role: Researcher
team: University of Central Florida
tools: [Tensile testing, Digital image correlation, MATLAB image analysis]
tags: [Manufacturing, Mechanics]
cover: dic-strain-field.jpg
---

<!-- Draft carried over from the old site. Rewrite in your own words. -->

## Process, porosity and strength

Metal additive manufacturing trades the predictability of wrought stock for design freedom, but process parameters leave behind internal porosity that drives where and how a part fails. To use AM structurally, you have to connect **process → porosity → mechanical behavior** with real data.

## Mechanical characterization

I ran tensile tests on 15-5PH stainless specimens printed across a range of process parameters, capturing full-field deformation with digital image correlation instead of a single extensometer.

![Speckled AM tensile specimen.](speckled-specimen.jpg)
![Stress-strain curve reconstructed from DIC data.](stress-strain-curve.jpg)

- Reconstructed stress-strain curves and E<sub>yy</sub> strain fields from speckle-tracked video.
- Extracted modulus, yield and ultimate strength, and compared parameter sets to isolate process effects.

![Overlaid responses across the parameter sweep.](parameter-sweep-curves.png "small")

## Porosity analysis

To explain the scatter, I wrote a MATLAB pipeline that segments pores in cross-sectional micrographs, quantifying size, count and distribution so porosity can be correlated with measured strength and failure location.

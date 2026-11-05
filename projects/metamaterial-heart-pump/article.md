---
title: System ID of a Metamaterial Soft Robotic Ventricle
summary: A benchtop platform for identifying the pressure and flow dynamics of a 3D-printed metamaterial left ventricle. I designed and built the servo-driven piston pump that drives it.
date: 2026-05
org: MIT
period: Spring 2026
wip: true
role: Piston pump design & build
team: S. Kirschner, A. Mobius, D. Quevedo-Moreno, I. Sperandio. MIT 2.131 Advanced Instrumentation & Measurement
tools: [iSV57T servo, SFU1605 ball screw, PendoTECH pressure, Sensirion & ES Systems flow, Arduino, MATLAB]
tags: [Soft robotics, Medical devices]
cover: test-bench-labeled.png
metrics:
  - value: 91%
    label: Model fit on held-out validation data
  - value: 200 mL
    label: Pump stroke volume, sized for an adult ventricle
  - value: 1 Hz
    label: Actuation frequency
---

<!-- Condensed from the 2.131 paper "System Identification of a Metamaterial Heart". Edit freely. -->

## Metamaterial ventricle

Nearly 30% of patients on the heart transplant list die or become too ill for surgery within a year of waiting. An artificial ventricle has to do more than move fluid: it must reproduce the heart's pressure generation, flow regulation and response to load. Architected metamaterials are a promising route because their programmed structure can tune those mechanics in ways a plain elastic shell can't.

The ventricle starts from a segmented MRI scan of a patient's left ventricle. A rule-based algorithm assigns idealized muscle-fiber orientations (helix angle +60° to −60°), and a procedural texturing method fills the wall with a fiber-like lattice that is rigid along the fibers and flexible across them. The lattice is printed in Formlabs Elastic 50A and cast between two PVA cryogel shells, forming a ventricle cavity and a surrounding actuator cavity. Pulling volume out of the actuator cavity collapses the lattice across the fibers, squeezes the ventricle and ejects fluid, mimicking how cardiac muscle contracts.

![Design framework, assembled actuator, finite element simulation, and the fabricated ventricle at rest and actuated.](metamaterial-ventricle-design.png "small")

## Piston pump

The pump had to reproduce an adult ventricle: a 200 mL stroke volume, 50 L/min peak flow and 1 atm of vacuum, across the natural heart-rate range of 60–120 BPM. It is a single-stroke design, so one pump cycle maps directly to one heartbeat. An SC80×200 cylinder is driven by a 5 mm-lead SFU1605 ball-screw stage coupled to an iSV57T-180S servo (0.6 N·m at 3000 RPM), all on a 2020 T-slot frame.

It works with either water or air. Water is incompressible, so the displaced volume is exactly known, but its higher inertia limits the pumping frequency. The tests reported here ran on air with an 80 mm stroke, at up to 2 Hz (120 BPM). The servo ran closed-loop on trapezoidal velocity profiles through the manufacturer's tuning software, or open-loop on sinusoidal velocity profiles from step and direction signals sent by an Arduino Nano.

## Instrumentation

PendoTECH pressure sensors are read by two 24-bit NAU7802 ADCs, and flow is measured by a Sensirion SFM3003 mass flow meter and an ES Systems ESRF-ESF MEMS sensor. The SFM3003 has a hardcoded I²C address that clashes with the ADCs, so a TCA9548A multiplexer sits between them and an Arduino Nano Every. The ADCs top out at 320 samples per second, and the full system reached about 250. A multithreaded Python script logs the serial stream to CSV while updating a live dashboard, and the data are resampled onto a uniform time base afterwards.

![Data acquisition: pressure and flow signals are digitized, multiplexed into the microcontroller and streamed to a laptop.](data-acquisition.png "wide")

## System identification

We first tried broadband identification: a pseudo-square-wave velocity input, with the frequency response estimated by Welch's method. The spectra showed harmonics a linear system wouldn't produce, and coherence stayed below 0.5 across most of the band, so we switched to steady-state sine inputs at discrete frequencies from 0.2 to 1 Hz.

![Input and output flow during one actuation cycle.](single-cycle-flow.png)
![Input and output flow profiles stacked across excitation frequencies.](frequency-sweep-flow.png)

A lumped spring-mass-damper can't capture the ventricle: every lattice cell has its own mass and elasticity, which makes the wall a distributed system with high-order lag and subtle resonances. The data were fit with a multi-input, single-output Hammerstein-Wiener model, a static input nonlinearity, then a linear dynamic block, then a static output nonlinearity. Its inputs are the input flow, its derivative and its integral (the cavity volume). In the identified model, an 11th-order flow term captures structural resonances in the lattice, a 3rd-order rate term captures viscoelastic damping, and a 3rd-order volume term captures how the material stiffens as the cavity fills.

The model was trained on 80% of the recordings. On the held-out 20% it reached a **91% fit**, and it reproduces the ventricle's hysteresis. The area inside that loop is energy lost to friction in the elastomer and viscous losses in the fluid. Residual cross-correlation stayed within the 95% confidence bounds, a sign that the model captures the real input-output dynamics rather than overfitting individual recordings.

![Model prediction against measured output flow on a validation recording.](model-validation.png)
![Hysteresis loop: loading and unloading paths diverge.](hysteresis-loop.png)

## Next steps

The 91% model predicts well, but its high order makes it hard to interpret physically. The next model will have fewer terms, each tied to a physical mechanism such as fluid inertance, flow resistance or tubing compliance. Switching both the actuation and circulatory sides from air to water will isolate the metamaterial's own nonlinearity. Connecting the ventricle to a mock circulatory loop with realistic vascular resistance and compliance would then make it a testbed for medical devices.

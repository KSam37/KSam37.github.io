---
title: Continuous Intramuscular Compartment Pressure Monitoring Device
summary: A wearable, Bluetooth-connected patch that monitors intracompartmental pressure continuously, built with MGH clinicians and accurate to 1 mmHg at the diagnostic threshold.
date: 2026-04
org: MIT · MGH
period: Spring 2026
role: Design, fabrication & validation
team: MIT 2.750 Medical Device Design, with Dr. Michael Fuenfer (MGH Pediatric Critical Care)
tools: [ESP32-C6, Bluetooth LE, Pressure transducer, Ballistics-gel phantom]
tags: [Medical devices, Embedded systems]
cover: device-prototype.png
metrics:
  - value: ±1 mmHg
    label: Accuracy at the 30 mmHg diagnostic level
  - value: 20 h
    label: Continuous monitoring per charge
  - value: "≪ $3,000"
    label: Target cost versus the incumbent device
---

<!-- Draft carried over from the old site. Rewrite in your own words.
     Older renders, the old validation plot and the team photo are in _unused/. -->

## Compartment syndrome

Acute compartment syndrome follows fractures, burns and crush injuries. Pressure rises inside a muscle compartment and chokes off perfusion. Above roughly 30 mmHg the treatment is an emergency fasciotomy; missed, the endpoint is tissue death and amputation. Onset can be silent, especially under regional anesthesia, when pain is masked.

The standard tool, the Stryker ICP monitor, costs about $3,000, takes one reading per needle insertion, and has no alarms. Our clinical proposer asked for a device that is **cheap, continuous, and loud when it matters.**

## Wearable patch

An indwelling 20-gauge flexible catheter connects through a luer lock to a pressure transducer on the patch. An ESP32 samples it, median-filters the signal, and streams readings over Bluetooth Low Energy. A 110 mAh battery runs about 20 hours. The housing curvature matches the limb, and the patch mounts with adhesive and a strap.

![Patch assembly: case, pressure transducer, ESP32, 110 mAh battery, luer lock and needle or catheter.](patch-assembly-labeled.png)
![The patch worn on the leg.](patch-on-leg.jpg)

A phone app plots the pressure trend and raises an audible and visual alarm when pressure crosses a programmable threshold.

![App alert as pressure crosses the 30 mmHg threshold.](phone-app-alert.png "noplate")

## Validation

We validated accuracy against a hydrostatic water column, where pressure is known exactly from ρgh. The device read **within 1 mmHg at the 30 mmHg diagnostic level**, with no systematic difference between needle and catheter delivery.

![Measured versus theoretical pressure on the water column, needle and catheter.](water-column-validation-plot.png "small")

To test in something closer to tissue, we built a phantom compartment (ballistics gel over an inflatable pouch in a nylon sleeve) and tracked programmed pressure ramps through the full needle-to-app chain. Battery endurance testing confirmed 20 h 13 min of continuous sampling.

## Design details

- **Needle fabrication.** Test needles were modified to mimic the Stryker non-coring geometry, tip soldered shut and side ports cut, so tissue doesn't plug the lumen.
- **Signal chain.** One sample per minute with a rolling median rejects motion spikes without smearing real trends.
- **Beyond the leg.** The same platform extends to abdominal and intracranial pressure.

## Next steps

Animal and clinical testing, head-to-head comparison with the Stryker and MY01 devices, and motion-artifact filtering for ambulatory patients.

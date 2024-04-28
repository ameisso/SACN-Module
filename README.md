# SACN-Module
[Open stage control](http://openstagecontrol.ammd.net/) sACN module

This module converts OSC messages into sACN. 

#### Usage
##### declare the desired universes 
change sacnModule.js file accordingly : 
`const dmxUniverses = [1, 2, 10];` for universes 1,2 and 10
 

##### send sACN
in O-S-C set the osc address to : 
`/sacn/3` to update channel 3 of universe 1 
`/sacn/1/3` to update channel 3 of universe 1 
`/sacn/2/4` to update channel 4 of universe 2
`/sacn` where first arg is the channel and second arg the value (only for universe 1) 

! values are from 1-100

`/sacn/reload` to reload the sender 

##### forward sACN
This module can forward sacn. So when it receives an OSC message from an application, sacn is updated

#### TODO
- fix : ability to send 0-255 value 
- dynamically open/close universes 
- ability to save/recall snapshots of a frame with intensity 
- ...
node-red-contrib-omron-fins
===========================

## Overview
This is a Node-RED node module to directly interface with OMRON PLCs over FINS Ethernet protocol. 
For now it only supports READ and WRITE of WORD or BIT addresses over FINS UDP.
Tested on CV, CS, CJ, NJ and NX PLCs (the ones with FINS support)

## Version Update Notes
This release (and possibly future releases up to V1.0.0) has breaking changes.
Where possible, I make every attempt to keep things compatible, but as node-red improves (typedInput widgets for example) I too improve this node to make things easier or better. And sometimes, it becomes plain obvious a wrong decision was made that needs to be rectified before it becomes too late to change - it happens :)
Semantic Versioning 2.0.0 will be followed after V1 however for now, where you see `V0.x.y`...
* `x` = major / minor change
* `y` = patch / bugfix

## Tips
* On a reasonable VM, I have managed to achieve polling speeds less than 10ms (100+ reads per second) HOWEVER this really taxes NODE and Node-red. Through usage and testing, this node works very well polling 10 times per second (100ms poll time). This is often more than enough for UI type applications
* Where possible, group your items together in the PLC and do 1 large read as opposed to multiple small reads.  Reading 20 WDs from 1 location is much faster than reading 20 single items. An additional benefit of reading multiple items in one poll is the data is consistent (i.e. all values were read at on the same PLC poll) 

## Prerequisites

* node.js	
* Node-RED
* git	(optional) (Used for repository cloning/downloads)

## Credits
Credit to [Patrick Servello (patrick--)](https://github.com/patrick--) for his original implementation of FINS

## Install

### Pallet Manager...

The simplest method is to install via the pallet manager in node red. Simply search for **node-red-contrib-omron-fins** then click install

### Terminal... 

Run the following command in the root directory of your Node-RED install  (usually `~/.node-red` or `%userprofile%\.node-red`)

    npm node-red-contrib-omron-fins

Or, install direct from github

    npm install steve-mcl/node-red-contrib-omron-fins

Or clone to a local folder and install using NPM

    git clone https://github.com/Steve-Mcl/node-red-contrib-omron-fins.git
    npm install /source-path/node-red-contrib-omron-fins



## A working example...

### PLC Setup
| Setting | Value |
|----|------|
| IP | 192.168.4.88 |
| MASK | 255.255.255.0 |
| Node | 88 |
| UDP | 9600 |
 

### Node-red Setup
| Setting | Value |
|----|------|
| IP | 192.168.4.179 |
| MASK | 255.255.255.0 |


### FINS Connection Node Settings
| Option | Value |
|----|------|
Host | 192.168.4.88
Port | 9600
MODE | NJ/NX
ICF | 0x80
DNA | 0
DA1 | 88
DA2 | 0
SNA | 0
SA1 | 179
SA2 | 0


![image](https://user-images.githubusercontent.com/44235289/85577974-9c4a7700-b631-11ea-8320-99992892b39d.png)

#### Other notes:
* If the subnet mask is bigger than /24 (e.g. is bigger than 255.255.255.0) you might need to enter the IP and NODE number (of the node-red server) into the FINS **IP address table** so that the PLC understands which IP to respond to when responding to the SA1 NODE number
* FINS works with PLC Addresses.  NJ and NX PLCs do NOT have direct addresses to addresses like DM or E0_, E1_. 
   * In order to use C Series addresses in an N Series PLC, you will need to create a variable in the PLC and set its `AT` property. E.G. If you want to read and write 40 WDs from E0_9000 ~ E0_9039 then you need to add a TAG like this  `TAG_NAME      ARRAY[0..39] Of WORD        %E0_9000`
   ![image](https://user-images.githubusercontent.com/44235289/85562713-a619ad80-b624-11ea-971b-dc22754d7cf1.png)
   

## Data formats and conversion

NOTES
* This node returns a buffer, 16bit signed or 16bit unsigned data for WD addresses only.  
* This node returns a buffer, boolean (true/false) or 1/0 for BIT addresses only.  
While this may seem restrictive, it is a deliberate design decision to keep the node mean and lean. 

### Read on...

As I use multiple PLCs and didn't want to write boolean / 32bit / float / double functionality into each node (it's best to keep things atomic and good at what they do) so I wrote a separate second node for handling data conversions.

This node "node-red-contrib-buffer-parser" https://flows.nodered.org/node/node-red-contrib-buffer-parser is capable of pretty much anything you will need for this or any PLC that returns 16bit data or a NodeJS Buffer.

In essence, you pull a bunch of data from the plc in one go & convert it all in the buffer-parser node to almost any format you could wish for (bits, floats, 32bit signed / unsigned, byteswapping etc etc). It can do 1 or many conversions all at once. It can send a [grouped item](https://github.com/Steve-Mcl/node-red-contrib-buffer-parser#example-2---array-of-data-to-an-named-objects) (object) or individual items [with a `topic`](https://github.com/Steve-Mcl/node-red-contrib-buffer-parser#example-1---array-of-data-to-mqtt-multiple-topics--payloads) ready for pushing your data directly from the PLC to MQTT. 

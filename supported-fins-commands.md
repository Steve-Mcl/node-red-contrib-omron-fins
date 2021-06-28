# Supported Commands

## I/O memory area access

[01,01] MEMORY AREA READ. Reads the contents of consecutive I/O memory area words.

[01,02] MEMORY AREA WRITE. Writes the contents of consecutive I/O memory area words.

[01,03] MEMORY AREA FILL. Writes the same data to the specified range of I/O memory area words.

[01,04] MULTIPLE MEMORY AREA READ. Reads the contents of specified non-consecutive I/O memory area words.

[01,05] MEMORY AREA TRANSFER. Copies the contents of consecutive I/O memory area words to another I/O memory area.

## Parameter area access
TODO ~~[02,01] PARAMETER AREA READ. Reads the contents of the specified number of consecutive CPU Unit parameter area words starting from the specified word.~~

TODO ~~[02,02] PARAMETER AREA WRITE. Writes data to the specified number of consecutive CPU Unit parameter area words starting from the specified word.~~

TODO ~~[02,03] PARAMETER AREA FILL (CLEAR). Writes the same data to the specified range of parameter area words.~~

## Program area access
TODO ~~[03,06] PROGRAM AREA READ. Reads the UM (User Memory) area.~~

TODO ~~[03,07] PROGRAM AREA WRITE. Writes to the UM (User Memory) area.~~

TODO ~~[03,08] PROGRAM AREA CLEAR. Clears the UM (User Memory) area.~~


## Operating mode changes
[04,01] Set PLC Mode to RUN. Changes the CPU Unit’s operating mode to RUN or MONITOR.

[04,02] Set PLC Mode to STOP. Changes the CPU Unit’s operating mode to PROGRAM. 

## Machine configuration reading
[05,01] CPU UNIT DATA READ. Reads CPU Unit data.

TODO: ~~[05,02] CONNECTION DATA READ. Reads the model numbers of the device corresponding to addresses.~~


## Status reading 
[06,01] CPU UNIT STATUS READ. Reads the status of the CPU Unit.

TODO: ~~[06,20] CYCLE TIME READ. Reads the maximum, minimum, and average cycle time.~~


## Time data access 
TODO: ~~[07,01] CLOCK READ. Reads the present year, month, date, minute, second, and day of the week.~~

TODO: ~~[07,02] CLOCK WRITE. Changes the present year, month, date, minute, second, or day of the week.~~


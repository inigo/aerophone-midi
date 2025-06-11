# Aerophone MIDI

A Web MIDI application built with Vite and TypeScript for interfacing with MIDI devices.

## Usage

1. Connect your MIDI device to your computer
2. Open the application in a supported web browser
3. Grant MIDI access when prompted
4. Your connected MIDI devices will appear in the device list
5. MIDI messages from input devices will be displayed in real-time

## Browser Compatibility

This application requires a browser that supports the Web MIDI API (e.g. recent Chrome, Firefox - not Safari).

You may well need to connect the aerophone physically, rather than via Bluetooth.

## Project Structure

The application is built with TypeScript and uses the Web MIDI API to interface with MIDI devices. Here's an overview of the main files:

### Main Files

- `index.html` - The main HTML file that provides the structure for the web application, including sections for MIDI status, device list, musical notation, and
  MIDI messages.

- `src/main.ts` - The entry point of the application that initializes the Web MIDI API and creates an instance of the MIDIApp.

- `src/midi-app.ts` - Contains the MIDIApp class that manages MIDI device connections, sets up event listeners for MIDI inputs, processes MIDI messages, and
  integrates with the NotationRenderer.

- `src/notation.ts` - Implements the NotationRenderer class that handles the visual representation of musical notation using the VexFlow library. It converts
  MIDI notes to musical notation and renders them on a stave.

- `src/types.ts` - Defines TypeScript interfaces for MIDI messages, devices, and event data to provide type safety throughout the application.

### Functionality

The application listens for MIDI input from connected devices, displays the received MIDI messages in real-time, and renders the notes being played as musical
notation. It supports note on/off events and updates the notation display dynamically as notes are played.

## License

This project is licensed under the GPL v3 License - see the [LICENSE](LICENSE) file for details.

Copyright (C) 2025 Inigo Surguy

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
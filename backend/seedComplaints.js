const http = require('http');

const complaintsToSeed = [
  {
    title: "Acid leak & toxic fumes in Chemistry Lab",
    description: "Severe chemical spill and smoke detected in chemistry lab 204, students evacuated immediately!",
    location_block: "Science Block",
    location_floor: "2nd Floor",
    location_room: "Lab 204",
    statusToSet: "in_progress",
    assignTo: "Admin",
    comment: "Emergency team deployed with neutralizing agents."
  },
  {
    title: "Elevator stuck between 3rd & 4th floors",
    description: "Elevator lift stuck between 3rd and 4th floor with 4 students trapped inside, emergency alarm ringing!",
    location_block: "Main Academic Building",
    location_floor: "3rd Floor",
    location_room: "Lift B",
    statusToSet: "open",
    assignTo: "Admin",
    comment: "Technicians contacted, ETA 15 minutes."
  },
  {
    title: "Sparks from corridor switchboard",
    description: "Electric spark and burning wire smell from switchboard near staircase, danger of short circuit!",
    location_block: "Block A",
    location_floor: "1st Floor",
    location_room: "Corridor 102",
    statusToSet: "resolved",
    assignTo: "Admin",
    comment: "Replaced burnt switchboard and tested voltage stability."
  },
  {
    title: "Air conditioner failure in seminar hall",
    description: "Air conditioner in seminar hall is blowing warm air and compressor not turning on during faculty seminar",
    location_block: "Admin Block",
    location_floor: "Ground Floor",
    location_room: "Hall 1",
    statusToSet: "in_progress",
    assignTo: "Admin",
    comment: "Refrigerant gas refill scheduled for tomorrow morning."
  },
  {
    title: "Ceiling fan regulator broken and stuck",
    description: "Fan regulator knob cracked and ceiling fan stuck at maximum speed making rattling grinding noise",
    location_block: "Hostel Block B",
    location_floor: "2nd Floor",
    location_room: "Room 214",
    statusToSet: "open"
  },
  {
    title: "WiFi disconnects during placement exam",
    description: "Campus WiFi internet is dropping every two minutes with high packet loss, placement exam tomorrow asap!",
    location_block: "Computer Science Block",
    location_floor: "3rd Floor",
    location_room: "Lab 5",
    statusToSet: "in_progress",
    assignTo: "Admin",
    comment: "Rebooted core switch; monitoring packet drops."
  },
  {
    title: "Hostel Wi-Fi captive portal failure",
    description: "Captive portal login page fails to load credentials for all student devices in wing 1",
    location_block: "Hostel Block D",
    location_floor: "1st Floor",
    location_room: "Wing 1",
    statusToSet: "open"
  },
  {
    title: "Main water supply pipeline burst",
    description: "High pressure water pipe burst flooding the entire floor corridor outside washrooms!",
    location_block: "Mechanical Block",
    location_floor: "Ground Floor",
    location_room: "Washroom Area",
    statusToSet: "in_progress",
    assignTo: "Admin",
    comment: "Main inlet valve shut off; plumber welding pipe section."
  },
  {
    title: "Washbasin tap continuously dripping",
    description: "Water tap in restroom won't close completely, dripping constantly and wasting fresh water puddle",
    location_block: "Library Building",
    location_floor: "2nd Floor",
    location_room: "Restroom 2B",
    statusToSet: "resolved",
    assignTo: "Admin",
    comment: "Washer replaced, no further leakage."
  },
  {
    title: "Classroom projector flickering green",
    description: "Classroom 301 projector display cuts out every 5 minutes and shows distorted green lines during lectures",
    location_block: "Main Academic Building",
    location_floor: "3rd Floor",
    location_room: "Room 301",
    statusToSet: "open"
  },
  {
    title: "Podium microphone screeching audio",
    description: "Instructor podium microphone producing loud screeching feedback sound and amplifier cutting off",
    location_block: "Science Block",
    location_floor: "1st Floor",
    location_room: "Auditorium",
    statusToSet: "resolved",
    assignTo: "Admin",
    comment: "Re-calibrated audio mixer gain and replaced XLR cable."
  },
  {
    title: "Cockroach infestation in dining hall",
    description: "Multiple cockroaches and dirty tables spotted around food serving counters in student cafeteria, highly unhygienic and disgusting!",
    location_block: "Cafeteria Complex",
    location_floor: "Ground Floor",
    location_room: "Dining Hall",
    statusToSet: "in_progress",
    assignTo: "Admin",
    comment: "Pest control agency contracted for evening fumigation."
  },
  {
    title: "Overflowing trash bins near staircase",
    description: "Garbage bins overflowing with plastic bottles and food waste, corridor not swept for two days",
    location_block: "Block B",
    location_floor: "2nd Floor",
    location_room: "Staircase Landing",
    statusToSet: "resolved",
    assignTo: "Admin",
    comment: "Sanitation team cleared bins and disinfected the area."
  },
  {
    title: "Contaminated dinner food in hostel mess",
    description: "Found dead caterpillar and foul odor in mess food rice today, students falling sick, this is totally unacceptable!!",
    location_block: "Hostel Mess",
    location_floor: "Ground Floor",
    location_room: "Mess Hall A",
    statusToSet: "in_progress",
    assignTo: "Admin",
    comment: "Mess vendor issued strict notice; sample sent for food testing."
  },
  {
    title: "Common laundry washing machine error",
    description: "Laundry washing machine drum locked with error E4, students unable to retrieve clothes",
    location_block: "Hostel Block A",
    location_floor: "Ground Floor",
    location_room: "Laundry Room",
    statusToSet: "open"
  },
  {
    title: "CCTV camera vandalized outside Gate 2",
    description: "CCTV security camera outside campus gate 2 has been turned to the wall and not recording",
    location_block: "Main Campus Gate",
    location_floor: "Ground",
    location_room: "Security Post 2",
    statusToSet: "open"
  },
  {
    title: "Deep pothole on main entrance road",
    description: "Large deep pothole on campus asphalt road, two bike riders slipped yesterday night",
    location_block: "Campus Perimeter",
    location_floor: "Ground",
    location_room: "Roadway South",
    statusToSet: "resolved",
    assignTo: "Admin",
    comment: "Road patch repair completed with tar mix."
  }
];

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function seed() {
  console.log(`Starting seeding of ${complaintsToSeed.length} complaints for user 'yashas'...`);

  for (const item of complaintsToSeed) {
    try {
      // 1. Submit complaint via POST /api/complaints
      const submitRes = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/complaints',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        title: item.title,
        description: item.description,
        registered_by: 'yashas',
        location_block: item.location_block,
        location_floor: item.location_floor,
        location_room: item.location_room
      });

      if (!submitRes.data || !submitRes.data.id) {
        console.error(`Failed to create: ${item.title}`, submitRes.data);
        continue;
      }

      const complaintId = submitRes.data.id;
      console.log(`✓ Created [${submitRes.data.category} | ${submitRes.data.ai_priority}]: "${item.title}"`);

      // 2. Assign & Update Status if specified
      if (item.statusToSet && item.statusToSet !== 'open') {
        await makeRequest({
          hostname: 'localhost',
          port: 5000,
          path: `/api/complaints/${complaintId}`,
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        }, {
          status: item.statusToSet,
          assigned_to: item.assignTo || 'Admin',
          user_id: 'admin'
        });
      } else if (item.assignTo) {
        await makeRequest({
          hostname: 'localhost',
          port: 5000,
          path: `/api/complaints/${complaintId}`,
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        }, {
          assigned_to: item.assignTo,
          user_id: 'admin'
        });
      }

      // 3. Add comment if specified
      if (item.comment) {
        await makeRequest({
          hostname: 'localhost',
          port: 5000,
          path: `/api/complaints/${complaintId}/comments`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, {
          message: item.comment,
          user_id: 'Admin'
        });
      }

    } catch (err) {
      console.error(`Error processing ${item.title}:`, err.message);
    }
  }

  console.log('\nAll complaints successfully seeded for student "yashas"!');
  process.exit(0);
}

seed();

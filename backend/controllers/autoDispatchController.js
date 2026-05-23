const User         = require('../models/User');
const Trip         = require('../models/Trip');
const Vehicle      = require('../models/Vehicle');
const LeaveRequest = require('../models/LeaveRequest');
const axios        = require('axios');
const { emitToUser, emitToRole } = require('../socket/emitter');
const { getDistanceKm }          = require('./locationController');
const { getRequiredVehicleType } = require('./vehicleController');


const getRoadInfo = async (fromLat, fromLng, toLat, toLng) => {
  try {
    if (!process.env.ORS_API_KEY) throw new Error('No ORS key')

    const res = await axios.get(
      'https://api.openrouteservice.org/v2/directions/driving-car',
    {
      
        headers: {
          'Authorization': process.env.ORS_API_KEY
        },
        params: {
          start:   `${fromLng},${fromLat}`, 
          end:     `${toLng},${toLat}`,
        },
        timeout: 5000,
      }
    )

    const segment  = res.data.features[0].properties.segments[0]
    const distanceKm  = segment.distance / 1000       // meters → km
    const durationMin = Math.ceil(segment.duration / 60) // seconds → min

    return { distanceKm, durationMin, source: 'ors' }
  } catch (e) {

    console.log('[ORS] Fallback to estimate:', e.message)
    const straight   = getDistanceKm(fromLat, fromLng, toLat, toLng)
    const roadDist   = straight * 1.4
    const durationMin = Math.ceil((roadDist / 30) * 60) + 10
    return { distanceKm: roadDist, durationMin, source: 'estimate' }
  }
}


const canDriverReachOnTime = (etaMinutes, scheduledAt) => {
  const now              = new Date()
  const scheduled        = new Date(scheduledAt)
  const minutesUntilTrip = (scheduled - now) / (1000 * 60)

  
  if (minutesUntilTrip > 120) return { onTime: true, lateBy: 0 }


  if (etaMinutes <= minutesUntilTrip) {
    return { onTime: true, lateBy: 0 }
  }

  // Driver late hoga
  const lateBy = Math.ceil(etaMinutes - minutesUntilTrip)
  return { onTime: false, lateBy }
}


const getDriverOccupancyWindow = (
  scheduledAt, driverToPickupMins, pickupToDropMins, airportWaitMins = 20
) => {
  const scheduled = new Date(scheduledAt)
  const departure = new Date(
    scheduled.getTime() - (driverToPickupMins + 15) * 60 * 1000
  )
  const tripEnd = new Date(
    scheduled.getTime() +
    (airportWaitMins + pickupToDropMins + 15) * 60 * 1000
  )
  return { departure, tripEnd }
}


const isDriverFreeAt = async (
  driverId, scheduledAt,
  pickupLat, pickupLng,
  dropLat,   dropLng,
  travelMode = 'other'  
) => {
  const time = new Date(scheduledAt)

  const onLeave = await LeaveRequest.findOne({
    driver: driverId, status: 'approved',
    fromDate: { $lte: time }, toDate: { $gte: time },
  })
  if (onLeave) return false

  const existingTrips = await Trip.find({
    driver: driverId,
    status: { $nin: ['completed', 'cancelled', 'queued'] },
  })
  if (!existingTrips.length) return true

  const driver = await User.findById(driverId).select('location')

  for (const existing of existingTrips) {

 
    if (existing.driverDepartureTime && existing.estimatedFreeTime) {
      const departure = existing.driverDepartureTime
      const tripEnd   = existing.estimatedFreeTime

    
      let newToPickup   = { durationMin: 30 }
      let newPickupDrop = { durationMin: 45 }

      if (driver?.location?.lat && pickupLat && pickupLng) {
        newToPickup = await getRoadInfo(
          driver.location.lat, driver.location.lng,
          parseFloat(pickupLat), parseFloat(pickupLng)
        )
      }
      if (pickupLat && pickupLng && dropLat && dropLng) {
        newPickupDrop = await getRoadInfo(
          parseFloat(pickupLat), parseFloat(pickupLng),
          parseFloat(dropLat),   parseFloat(dropLng)
        )
      }

      const newAirportWait = travelMode === 'flight' ? 25
                           : travelMode === 'train'  ? 10
                           : travelMode === 'bus'    ? 5 : 0

      const newWindow = getDriverOccupancyWindow(
        scheduledAt, newToPickup.durationMin,
        newPickupDrop.durationMin, newAirportWait
      )

      const overlap = (newWindow.departure < tripEnd && newWindow.tripEnd > departure)
      if (overlap) return false
      continue  
    }
    let existingToPickup = { durationMin: 30 }
    let existingPickupDrop = { durationMin: 45 }

    if (driver?.location?.lat && existing.pickupLocation?.lat) {
      existingToPickup = await getRoadInfo(
        driver.location.lat, driver.location.lng,
        existing.pickupLocation.lat, existing.pickupLocation.lng
      )
    }
    if (existing.pickupLocation?.lat && existing.dropLocation?.lat) {
      existingPickupDrop = await getRoadInfo(
        existing.pickupLocation.lat, existing.pickupLocation.lng,
        existing.dropLocation.lat,   existing.dropLocation.lng
      )
    }

    // Existing trip ka travelMode se airportWait decide karo
    const existingAirportWait = existing.travelMode === 'flight' ? 25
                              : existing.travelMode === 'train'  ? 10
                              : existing.travelMode === 'bus'    ? 5 : 0

    const existingWindow = getDriverOccupancyWindow(
      existing.scheduledAt,
      existingToPickup.durationMin,
      existingPickupDrop.durationMin,
      existingAirportWait
    )

    let newToPickup   = { durationMin: 30 }
    let newPickupDrop = { durationMin: 45 }

    if (driver?.location?.lat && pickupLat && pickupLng) {
      newToPickup = await getRoadInfo(
        driver.location.lat, driver.location.lng,
        parseFloat(pickupLat), parseFloat(pickupLng)
      )
    }
    if (pickupLat && pickupLng && dropLat && dropLng) {
      newPickupDrop = await getRoadInfo(
        parseFloat(pickupLat), parseFloat(pickupLng),
        parseFloat(dropLat),   parseFloat(dropLng)
      )
    }

    
    const newAirportWait = travelMode === 'flight' ? 25
                         : travelMode === 'train'  ? 10
                         : travelMode === 'bus'    ? 5 : 0

    const newWindow = getDriverOccupancyWindow(
      scheduledAt,
      newToPickup.durationMin,
      newPickupDrop.durationMin,
      newAirportWait
    )

    const overlap = (
      newWindow.departure < existingWindow.tripEnd &&
      newWindow.tripEnd   > existingWindow.departure
    )
    if (overlap) return false
  }
  return true
}


const findBestDriver = async (
  guestId, scheduledAt,
  pickupLat, pickupLng,
  dropLat,   dropLng ,travelMode
) => {
  const allDrivers = await User.find({
    role: 'driver', isActive: true,
    status: { $in: ['available', 'off_duty'] },
  }).select('name status location vehicleNumber vehicleType')

  const candidates = []

  for (const driver of allDrivers) {
    const free = await isDriverFreeAt(
      driver._id, scheduledAt,
      pickupLat, pickupLng, dropLat, dropLng,
      travelMode   
    )
    if (!free) continue

    let roadInfo = { durationMin: 30, distanceKm: 0, source: 'estimate' }
    let onTimeInfo = { onTime: true, lateBy: 0 }

    if (driver.location?.lat && pickupLat && pickupLng) {
      roadInfo = await getRoadInfo(
        driver.location.lat, driver.location.lng,
        parseFloat(pickupLat), parseFloat(pickupLng)
      )
      onTimeInfo = canDriverReachOnTime(roadInfo.durationMin, scheduledAt)
    }

  
    const minutesUntilTrip = (new Date(scheduledAt) - new Date()) / (1000 * 60)
    if (minutesUntilTrip <= 120 && !onTimeInfo.onTime) {
      console.log(`[Dispatch] ${driver.name} will be ${onTimeInfo.lateBy} min late — skipping`)
      continue
    }

    let score = 0
    if (roadInfo.distanceKm) score += Math.max(0, 100 - roadInfo.distanceKm * 5)

    const tripsTogether = await Trip.countDocuments({
      driver: driver._id, guest: guestId, status: 'completed',
    })
    score += tripsTogether * 10

    candidates.push({
      driver,
      score,
      eta:        roadInfo.durationMin,
      distanceKm: roadInfo.distanceKm,
      lateBy:     onTimeInfo.lateBy,
      source:     roadInfo.source,
    })
  }

  if (!candidates.length) return null
  candidates.sort((a, b) => b.score - a.score)
  return candidates[0]
}

// ── GUEST REQUEST TRIP ─────────────────────────────────
// @route  POST /api/dispatch/request
// @access Guest
const guestRequestTrip = async (req, res) => {
  try {
    const {
      pickupAddress, pickupLat, pickupLng,
      dropAddress,   dropLat,   dropLng,
      scheduledAt,   travelMode, travelNumber,
      passengerCount = 1, notes,
    } = req.body

    if (!pickupAddress || !dropAddress || !scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'pickupAddress, dropAddress and scheduledAt required',
      })
    }

    const vehicleType = getRequiredVehicleType(passengerCount)
    const best        = await findBestDriver(
      req.user._id, scheduledAt,
      pickupLat, pickupLng, dropLat, dropLng , travelMode
    )

   
    let tripInfo = { durationMin: 45, distanceKm: 0 }
    if (pickupLat && pickupLng && dropLat && dropLng) {
      tripInfo = await getRoadInfo(
        parseFloat(pickupLat), parseFloat(pickupLng),
        parseFloat(dropLat),   parseFloat(dropLng)
      )
    }

  
    const airportWaitMins = travelMode === 'flight' ? 25
                          : travelMode === 'train'  ? 10
                          : travelMode === 'bus'    ? 5 : 0

  
    const scheduled = new Date(scheduledAt)
    const driverToPickupMins = best?.eta || 30
    const pickupToDropMins   = tripInfo.durationMin || 45

   
    const driverDepartureTime = new Date(
      scheduled.getTime() - (driverToPickupMins + 15) * 60 * 1000
    )

    const estimatedPickupTime = scheduled

    const estimatedBoardTime = new Date(
      scheduled.getTime() + airportWaitMins * 60 * 1000
    )
 
    const estimatedDropTime = new Date(
      estimatedBoardTime.getTime() + pickupToDropMins * 60 * 1000
    )

    const estimatedFreeTime = new Date(
      estimatedDropTime.getTime() + 10 * 60 * 1000
    )

    const vehicle  = best
      ? await Vehicle.findOne({ vehicleType, status: 'available', isActive: true })
      : null
    const isQueued = !best

    const trip = await Trip.create({
      guest:   req.user._id,
      driver:  best?.driver._id || null,
      vehicle: vehicle?._id     || null,
      pickupLocation: {
        address: pickupAddress,
        lat: pickupLat ? parseFloat(pickupLat) : null,
        lng: pickupLng ? parseFloat(pickupLng) : null,
      },
      dropLocation: {
        address: dropAddress,
        lat: dropLat ? parseFloat(dropLat) : null,
        lng: dropLng ? parseFloat(dropLng) : null,
      },
      scheduledAt, travelMode: travelMode || 'other', travelNumber,
      passengerCount: parseInt(passengerCount), notes,
      createdBy: req.user._id,
      status:    isQueued ? 'queued' : 'assigned',

 
      driverDepartureTime:  isQueued ? null : driverDepartureTime,
      estimatedPickupTime:  isQueued ? null : estimatedPickupTime,
      estimatedBoardTime:   isQueued ? null : estimatedBoardTime,
      estimatedDropTime:    isQueued ? null : estimatedDropTime,
      estimatedFreeTime:    isQueued ? null : estimatedFreeTime,
      driverToPickupMins:   isQueued ? null : driverToPickupMins,
      pickupToDropMins:     isQueued ? null : pickupToDropMins,
      airportWaitMins,

      statusHistory: [{
        status:    isQueued ? 'queued' : 'assigned',
        updatedBy: req.user._id,
        note: isQueued
          ? 'No driver available or no driver can reach on time — queued'
          : `Auto-assigned to ${best.driver.name}. Depart: ${driverDepartureTime.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})} | ETA: ${best.eta} min | Free: ${estimatedFreeTime.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})}`,
      }],
    })

    if (vehicle && best) {
      await Vehicle.findByIdAndUpdate(vehicle._id, {
        status: 'in_use', currentDriver: best.driver._id,
      })
    }

    const populated = await Trip.findById(trip._id)
      .populate('driver',  'name phone vehicleNumber vehicleType')
      .populate('vehicle', 'plateNumber vehicleType capacity')

    if (!isQueued) {
      emitToUser(best.driver._id, 'trip_assigned', {
        message: `New trip — Guest: ${req.user.name}. Pickup: ${pickupAddress}`,
        trip: populated,
      })
      emitToRole('admin', 'trip_auto_assigned', {
        message: `Auto-assigned to ${best.driver.name} (ETA: ${best.eta} min)`,
        trip: populated,
      })
    } else {
      emitToRole('admin', 'trip_queued', {
        message: `No driver available/on-time for ${req.user.name} — queued`,
        trip: populated,
      })
    }

    res.status(201).json({
      success: true,
      isQueued,
      message: isQueued
        ? 'Koi driver available nahi ya time pe nahi pohonch sakta. Trip queue mein — notify karenge.'
        : `Driver ${populated.driver?.name} assign hua!`,
      eta:          best?.eta          || null,
      distanceKm:   best?.distanceKm   || null,
      tripDuration: tripInfo.durationMin,
      tripDistance: tripInfo.distanceKm,
      etaSource:    best?.source || 'estimate',
      data: populated,
    })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}


const guestReportDelay = async (req, res) => {
  try {
    const { newScheduledAt, delayReason, newTravelNumber } = req.body
    if (!newScheduledAt) {
      return res.status(400).json({ success: false, message: 'newScheduledAt required' })
    }

    const trip = await Trip.findOne({
      _id:    req.params.tripId,
      guest:  req.user._id,
      status: { $nin: ['completed', 'cancelled'] },
    }).populate('driver', 'name')

    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' })

    const oldTime    = trip.scheduledAt
    trip.scheduledAt = new Date(newScheduledAt)
    trip.status      = 'delayed'
    if (newTravelNumber) trip.travelNumber = newTravelNumber

    trip.statusHistory.push({
      status:    'delayed',
      updatedBy: req.user._id,
      note: `Guest ne delay report kiya. Reason: ${delayReason || 'N/A'}. ${oldTime.toISOString()} → ${new Date(newScheduledAt).toISOString()}`,
    })
    await trip.save()

    const newTimeStr = new Date(newScheduledAt).toLocaleString('en-IN', {
      day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'
    })

    if (trip.driver) {
      emitToUser(trip.driver._id || trip.driver, 'trip_delayed', {
        message: `⏰ Trip delayed — Naya time: ${newTimeStr}. Reason: ${delayReason || 'N/A'}. Ruko, jaldi mat niklo.`,
        trip,
      })
    }

    emitToRole('admin', 'trip_delayed', {
      message: `Guest ne trip delay ki — Driver ko hold karo. Naya time: ${newTimeStr}`,
      trip,
    })

    res.json({
      success: true,
      message: `Driver aur admin notify ho gaye. Naya time: ${newTimeStr}`,
      data: trip,
    })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}


const guestReady = async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id:    req.params.tripId,
      guest:  req.user._id,
      status: { $in: ['assigned', 'acknowledged', 'delayed'] },
    }).populate('driver', 'name')

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found ya driver already en route hai',
      })
    }

    trip.statusHistory.push({
      status:    trip.status,
      updatedBy: req.user._id,
      note:      `✅ Guest ready — "${req.user.name}" bahar hai. Driver ab nikal sakta hai.`,
    })
    await trip.save()

  
    if (trip.driver) {
      emitToUser(trip.driver._id || trip.driver, 'guest_ready', {
        message: `🟢 ${req.user.name} bahar hai! Ab niklo — pickup ke liye.`,
        tripId:  trip._id,
        guest:   { name: req.user.name, phone: req.user.phone },
        pickup:  trip.pickupLocation,
      })
    }

    emitToRole('admin', 'guest_ready', {
      message: `Guest ${req.user.name} ready — Driver ${trip.driver?.name} ko notify kiya`,
      tripId:  trip._id,
    })

    res.json({
      success: true,
      message: `Driver ${trip.driver?.name} ko notify kar diya — woh ab niklenga!`,
    })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

const driverReportIssue = async (req, res) => {
  try {
    const { reason, issueType } = req.body
    const trip = await Trip.findOne({
      _id: req.params.tripId, driver: req.user._id,
      status: { $nin: ['completed', 'cancelled'] },
    })
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' })

    trip.statusHistory.push({
      status: trip.status, updatedBy: req.user._id,
      note: `⚠️ Issue: ${issueType} — ${reason}`,
    })
    await trip.save()

    emitToRole('admin', 'driver_issue_reported', {
      message:    `⚠️ ${req.user.name} reported: ${issueType} — ${reason}`,
      tripId:     trip._id,
      driverName: req.user.name,
      issueType,  reason,
    })

    res.json({ success: true, message: 'Issue reported. Admin notified.' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}


const getAvailableDrivers = async (req, res) => {
  try {
    const { scheduledAt, passengers = 1, pickupLat, pickupLng, dropLat, dropLng } = req.query
    const allDrivers = await User.find({ role:'driver', isActive:true })
      .select('name status vehicleNumber vehicleType location')

    const result = await Promise.all(allDrivers.map(async (d) => {
      const free = await isDriverFreeAt(d._id, scheduledAt, pickupLat, pickupLng, dropLat, dropLng, 'other')
      let roadInfo  = { durationMin: null, distanceKm: null }
      let onTimeInfo = { onTime: true, lateBy: 0 }

      if (d.location?.lat && pickupLat && pickupLng) {
        roadInfo   = await getRoadInfo(d.location.lat, d.location.lng, parseFloat(pickupLat), parseFloat(pickupLng))
        onTimeInfo = canDriverReachOnTime(roadInfo.durationMin, scheduledAt)
      }

      return {
        _id: d._id, name: d.name, status: d.status,
        vehicleNumber: d.vehicleNumber, vehicleType: d.vehicleType,
        isAvailable:  free,
        etaMinutes:   roadInfo.durationMin,
        distanceKm:   roadInfo.distanceKm,
        canReachOnTime: onTimeInfo.onTime,
        lateByMinutes:  onTimeInfo.lateBy,
      }
    }))

    const available = result
      .filter(d => d.isAvailable)
      .sort((a, b) => (a.etaMinutes || 999) - (b.etaMinutes || 999))

    res.json({ success: true, data: { available, all: result } })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

module.exports = {
  guestRequestTrip, guestReportDelay, guestReady,
  driverReportIssue, getAvailableDrivers,
  findBestDriver, isDriverFreeAt, getRoadInfo,
}

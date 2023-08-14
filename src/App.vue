<template>
  <nav class="navbar bg-body-tertiary">
    <div class="container-fluid">
      <h5 class="navbar-brand my-0 mr-md-auto font-weight-normal" href="#">
        <img src="@/assets/logo.png" alt="Logo" width="30" height="30" class="d-inline-block align-text-top">
        BALIWAG MARITIME ACADEMY, INC.
      </h5>
      <div class="api-status">
        <api-status :isApiOnline="isApiOnline" />
      </div>
    </div>
  </nav>
  <div class="editors position-relative mt-5 m-5">
    <div class="container-fluid">
      <div class="row">
        <div class="col-md-4">
          <real-time-clock />
          <div class="scanner mt-2">
            <input type="password" class="form-control border border-success" placeholder="Scan your ID"
              ref="barcodeInput" @keydown="handleKeyDown" autofocus>
          </div>
        </div>
        <div class="col-md-8">
          <card-profile :profileData="profileDetails" :isOnline="isApiOnline" />
          <attendance-list :attendanceList="attendanceList" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ApiStatus from '@/components/ApiStatus.vue'
import RealTimeClock from '@/components/RealTimeClock.vue'
import CardProfile from '@/components/CardProfile.vue'
import AttendanceList from '@/components/AttendanceList.vue'
import axios from 'axios'
const { ipcRenderer } = require('electron');
export default {
  name: 'App',
  components: {
    ApiStatus,
    RealTimeClock,
    CardProfile,
    AttendanceList
  },
  data() {
    return {
      isApiOnline: false,
      pollInterval: 5000, // Poll every 5 seconds,
      profileDetails: null,
      attendanceList: { 'employee': [], 'student': [] }
    }
  },
  methods: {
    handleKeyDown(event) {
      if (event.key === "Enter") {
        event.preventDefault(); // Prevent form submission if needed
        const barcodeValue = event.target.value.trim();
        if (barcodeValue.length > 0) {
          this.processApi(barcodeValue);
          // Clear the input field after processing the scan
          this.$refs.barcodeInput.value = "";
        }
      }
    },
    processScannedBarcode(barcode) {
      // Here you can process the scanned barcode value
      console.log(barcode);
    },
    async checkApiStatus() {
      try {
        // Make an API request to check the status
        const response = await axios.get('attendance');
        if (response) {
          this.isApiOnline = true
          this.attendanceList = response.data.data
        } else {
          this.isApiOnline = false
        }
      } catch (error) {
        this.isApiOnline = false;
      }
    },
    startPolling() {
      this.pollingTimer = setInterval(this.checkApiStatus, this.pollInterval);
    },
    stopPolling() {
      clearInterval(this.pollingTimer);
    },
    processApi(newValue) {
      if (newValue) {
        this.callApiRequest(newValue)
      }
    },
    async callApiRequest(data) {
      try {
        //let filePath = '/user/'
        // Make an API request to check the status
        if (this.isApiOnline) {
          const response = await axios.get('attendance/store?data=' + data);
          if (response) {
            console.log('Save to the Server')
            if (response.data.data.status != 'error') {
              this.profileDetails = response.data.data
            } else {
              this.profileDetails = null
            }
          }
        }
        else {
          var username = data.includes('employee')
          let pathFile = ''
          if (username) {
            var user = data.replace('employee:', '')
            user = user.replace('employee', '')
            // Employee Account Retriving Files // User Path
            pathFile = 'Offline Storage/employee/data/' + user + '.json'
          } else {
            // Student Account  // User Path
            pathFile = 'Offline Storage/student/data/' + data + '@bma.edu.ph.json'
          }
          try {
            ipcRenderer.invoke('retriveJsonFile', pathFile)
            ipcRenderer.on('jsonFileData', (event, fileData) => {
              if (fileData !== null) {
                // Assuming fileData is a string containing JSON data
                this.fileContent = fileData
                // Convert the string to a JavaScript object
                let forwardedData = JSON.parse(this.fileContent)
                forwardedData = JSON.parse(forwardedData)
                const dateTime = this.getDateTime()
                console.log(dateTime)
                forwardedData['time_in'] = dateTime
                forwardedData['time_out'] = null
                console.log(forwardedData)
                forwardedData['is_saved'] = false
                ipcRenderer.invoke('saveOfflineAttendance', forwardedData);
                this.profileDetails = forwardedData
              } else {
                console.error('Failed to read JSON file or file is empty');
              }
            });
          } catch (error) {
            console.error('Error reading file:', error);
          }

        }
      } catch (error) {
        // Display a error
        console.log(error)
      }
    },
    getDateTime() {

      const currentDateTime = new Date();
      // Format the date and time as "YYYY-MM-DD HH:mm:ss"
      const formattedDateTime = `${currentDateTime.getFullYear()}-${(currentDateTime.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${currentDateTime.getDate().toString().padStart(2, '0')} ${currentDateTime
          .getHours()
          .toString()
          .padStart(2, '0')}:${currentDateTime.getMinutes().toString().padStart(2, '0')}:${currentDateTime
            .getSeconds()
            .toString()
            .padStart(2, '0')}`;
      return formattedDateTime.toString()
    },
    async applicationSetUp() {
      const child1 = 'data'
      const child2 = 'image'
      const child3 = 'attendance-logs'
      const main = 'Offline Storage'
      ipcRenderer.send('create-or-check-folder', main)
      let secondary = 'employee'
      ipcRenderer.send('create-or-check-folder', main + '/' + secondary)
      /* Child for Employee */
      ipcRenderer.send('create-or-check-folder', main + '/' + secondary + '/' + child1)
      ipcRenderer.send('create-or-check-folder', main + '/' + secondary + '/' + child2)
      ipcRenderer.send('create-or-check-folder', main + '/' + secondary + '/' + child3)
      secondary = 'student'
      ipcRenderer.send('create-or-check-folder', main + '/' + secondary)
      ipcRenderer.send('create-or-check-folder', main + '/' + secondary + '/' + child1)
      ipcRenderer.send('create-or-check-folder', main + '/' + secondary + '/' + child2)
      ipcRenderer.send('create-or-check-folder', main + '/' + secondary + '/' + child3)
      try {
        const response = await axios.get('data-sync');
        if (response.status == 200) {
          if (response.data.employees) {
            response.data.employees.forEach(async element => {
              // Save Image
              var link = new URL(element.image)
              let fileFormat = link.pathname.split('.').pop();
              let filename = element.email + '.' + fileFormat
              let folder = main + '/employee/' + child2
              await ipcRenderer.invoke('saveImageUrl', folder, filename, element.image)
              /* .then((result) => {
                 element['image'] = result
                 console.log(result)
              }); */
              element['image'] = folder + '/' + filename
              // Save Information
              const data = JSON.stringify(element);
              folder = main + '/employee/' + child1
              await ipcRenderer.invoke('saveUserData', data, folder, element.email + '.json');

            });
          }
        }
      } catch (error) {
        return false;
      }

    }
  },
  mounted() {
    this.startPolling();
    this.applicationSetUp()
  },
  beforeUnmount() {
    this.stopPolling();
  },
}
</script>

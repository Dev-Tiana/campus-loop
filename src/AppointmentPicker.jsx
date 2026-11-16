import React from 'react';

export function appointmentInputValue(timestamp){
 return Number.isFinite(timestamp)?new Date(timestamp+3600000).toISOString().slice(0,16):'';
}
export default function AppointmentPicker({label='Preferred date and time',initialAt}){
 return <label>{label} (Nigeria time)
  <input name="appointment" type="datetime-local" min={appointmentInputValue(Date.now())}
   defaultValue={initialAt>Date.now()?appointmentInputValue(initialAt):''} required/>
 </label>;
}

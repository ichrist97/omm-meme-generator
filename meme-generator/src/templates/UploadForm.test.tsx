import React, { useState } from "react";
import { render, screen } from '@testing-library/react';
import ReactDOM from 'react-dom'
import { UploadForm } from "./UploadForm";

test('renders without crashing', () => {
  const setCurrentTemplate = jest.fn();
  const div = document.createElement('div')
  ReactDOM.render(<UploadForm setCurrentTemplate={setCurrentTemplate}/>, div)
  ReactDOM.unmountComponentAtNode(div)
})
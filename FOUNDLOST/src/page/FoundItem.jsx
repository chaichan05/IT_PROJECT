import React, { useRef, useState } from "react";
import FormFoundItem from "../component/FormFoundItem";
import Navbar from "../component/Navbar";

const FoundItem = () => {
  return (
    <div className="app-page-with-navbar">
      <Navbar />
      <main className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mt-8">
      <FormFoundItem />
      </main>
    </div>
  );
};

export default FoundItem;

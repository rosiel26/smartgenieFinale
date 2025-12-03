import React from "react";
import { FiArrowLeft } from "react-icons/fi";

const DisclaimerModal = ({ onAcknowledge }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" style={{ paddingBottom: '80px' }}>
      <div className="bg-white  w-[340px] h-[90vh] max-h-[500px] rounded-3xl shadow-2xl overflow-hidden flex flex-col border-2 border-lime-500 animate-fadeIn">
        {/* Header */}
        <div className=" p-5 text-lime-500 shadow-lg flex items-center justify-between flex-shrink-0">
          <div className="w-6"></div>
          <div className="font-bold text-lg">Disclaimer</div>
          <div className="w-6"></div>
        </div>

        {/* Disclaimer Content */}
        <div
          className="p-5 flex-1 space-y-5 text-gray-700 text-sm overflow-y-auto"
          style={{ scrollbarWidth: "thin" }}
        >
          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">
              1. General Information
            </h2>
            <p>
              The content provided in Smart Genie is for general informational
              purposes only. While we strive to provide accurate and up-to-date
              information, we make no guarantees about the completeness,
              reliability, or accuracy of any content.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">
              2. Not Medical Advice
            </h2>
            <p>
              Smart Genie is not a substitute for professional medical advice,
              diagnosis, or treatment. Always consult your physician or other
              qualified health provider with any questions regarding a medical
              condition or dietary needs.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">
              3. No Liability
            </h2>
            <p>
              By using this app, you agree that Smart Genie and its developers
              are not liable for any direct, indirect, incidental, or
              consequential damages resulting from the use of the app, including
              health outcomes, data loss, or other issues.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">
              4. External Links
            </h2>
            <p>
              Smart Genie may contain links to third-party websites or
              resources. We are not responsible for the content or practices of
              these external sites.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">
              5. User Responsibility
            </h2>
            <p>
              Users are responsible for their own actions and decisions based on
              the information provided by the app. Always exercise caution and
              good judgment.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">
              6. Changes to Disclaimer
            </h2>
            <p>
              We may update this disclaimer at any time without prior notice.
              Continued use of the app constitutes acceptance of the updated
              disclaimer.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">7. Contact</h2>
            <p>
              For questions or concerns regarding this disclaimer, please
              contact us through the Contact Us page in the app.
            </p>
          </section>
        </div>

        {/* Acknowledge Button */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            onClick={onAcknowledge}
            className="w-full bg-black text-white py-3 rounded-lg hover:bg-lime-500 hover:text-black hover:font-semibold transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
          >
            Acknowledge and Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerModal;

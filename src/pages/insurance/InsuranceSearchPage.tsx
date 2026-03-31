import QuoteForm from "../../components/insurance/QuoteForm";
import { useLocation } from "react-router-dom";

const InsuranceSearchPage = () => {
  // keep, but QuoteForm reads location.state internally
  useLocation();
  return (
    <div>
      <QuoteForm />
    </div>
  );
};

export default InsuranceSearchPage;

'use client';
import 'stimulsoft-reports-js/Css/stimulsoft.designer.office2013.whiteblue.css';
import 'stimulsoft-reports-js/Css/stimulsoft.viewer.office2013.whiteblue.css';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState, store } from '@/lib/store/store';

const ReportDesigner = () => {
  const { reportData, detailDataReport } = useSelector(
    (state: RootState) => state.report
  );
  const { user, token, id } = useSelector((state: RootState) => state.auth);
  // Accept users as a prop
  useEffect(() => {
    // Dynamically import the library only on the client side
    import('stimulsoft-reports-js/Scripts/stimulsoft.blockly.editor')
      .then((module) => {
        const { Stimulsoft } = module;
        // Set your license and initialize the designer here
        Stimulsoft.Base.StiFontCollection.addOpentypeFontFile(
          '/fonts/tahomabd.ttf',
          'Tahoma'
        );
        Stimulsoft.Base.StiFontCollection.addOpentypeFontFile(
          '/fonts/tahoma.ttf',
          'Tahoma'
        );
        Stimulsoft.Base.StiLicense.Key =
          '6vJhGtLLLz2GNviWmUTrhSqnOItdDwjBylQzQcAOiHksEid1Z5nN/hHQewjPL/4/AvyNDbkXgG4Am2U6dyA8Ksinqp' +
          '6agGqoHp+1KM7oJE6CKQoPaV4cFbxKeYmKyyqjF1F1hZPDg4RXFcnEaYAPj/QLdRHR5ScQUcgxpDkBVw8XpueaSFBs' +
          'JVQs/daqfpFiipF1qfM9mtX96dlxid+K/2bKp+e5f5hJ8s2CZvvZYXJAGoeRd6iZfota7blbsgoLTeY/sMtPR2yutv' +
          'gE9TafuTEhj0aszGipI9PgH+A/i5GfSPAQel9kPQaIQiLw4fNblFZTXvcrTUjxsx0oyGYhXslAAogi3PILS/DpymQQ' +
          '0XskLbikFsk1hxoN5w9X+tq8WR6+T9giI03Wiqey+h8LNz6K35P2NJQ3WLn71mqOEb9YEUoKDReTzMLCA1yJoKia6Y' +
          'JuDgUf1qamN7rRICPVd0wQpinqLYjPpgNPiVqrkGW0CQPZ2SE2tN4uFRIWw45/IITQl0v9ClCkO/gwUtwtuugegrqs' +
          'e0EZ5j2V4a1XDmVuJaS33pAVLoUgK0M8RG72';
        const viewerOptions = new Stimulsoft.Viewer.StiViewerOptions();

        const viewer = new Stimulsoft.Viewer.StiViewer(
          viewerOptions,
          'StiViewer',
          false
        );
        const report = new Stimulsoft.Report.StiReport();

        const options = new Stimulsoft.Designer.StiDesignerOptions();
        options.appearance.fullScreenMode = true;

        const designer = new Stimulsoft.Designer.StiDesigner(
          options,
          'Designer',
          false
        );

        const dataSet = new Stimulsoft.System.Data.DataSet('Data');

        viewer.renderHtml('content');
        report.loadFile('/reports/LaporanLabaRugiKalkulasi.mrt');

        report.dictionary.dataSources.clear();
        dataSet.readJson({
          data: reportData // Use the prop data passed from parent
        });
        dataSet.readJson({
          detail: detailDataReport // Use the prop data passed from parent
        });
        report.regData(dataSet.dataSetName, '', dataSet);
        report.dictionary.synchronize();
        designer.report = report;
        designer.renderHtml('content');
        // viewer.report = report;

        // Use data from PHP for dataset
        // dataset.readJson({
        //   user: users // Use the prop data passed from parent
        // });

        // report.regData(dataset.dataSe
      })
      .catch((error) => {
        console.error('Failed to load Stimulsoft:', error);
      });
  }, [reportData, token]); // Add users to dependencies so it re-runs when users change

  return (
    <div
      id="content"
      className="report"
      style={{ textTransform: 'none', fontSize: 'unset' }}
    >
      {/* Konten lainnya */}
    </div>
  );
};

export default ReportDesigner;

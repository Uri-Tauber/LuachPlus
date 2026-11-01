import com.kosherjava.zmanim.ComplexZmanimCalendar;
import com.kosherjava.zmanim.util.GeoLocation;
import com.kosherjava.zmanim.util.NOAACalculator;
import java.util.*;

/** Run against the source commit identified in SPEC.md, not current Java master. */
public class KosherJavaReference {
    private static Date time(ComplexZmanimCalendar c, String method) throws Exception {
        Date rise = c.isUseElevation() ? c.getSunrise() : c.getSeaLevelSunrise();
        Date set = c.isUseElevation() ? c.getSunset() : c.getSeaLevelSunset();
        switch (method) {
            case "itimDawn90": return c.getSunriseOffsetByDegrees(109.75);
            case "itimDawn72": return c.getSunriseOffsetByDegrees(106.02);
            case "itimShemaStringent": return c.getSofZmanShma(c.getSunriseOffsetByDegrees(109.75), c.getTzaisGeonim6Point45Degrees());
            case "itimShema90": return c.getShaahZmanisBasedZman(c.getSunriseOffsetByDegrees(109.75), c.getSunsetOffsetByDegrees(109.75), 3);
            case "itimShema72": return c.getShaahZmanisBasedZman(c.getSunriseOffsetByDegrees(106.02), c.getSunsetOffsetByDegrees(106.02), 3);
            case "itimTfila90": return c.getShaahZmanisBasedZman(c.getSunriseOffsetByDegrees(109.75), c.getSunsetOffsetByDegrees(109.75), 4);
            case "itimTfila72": return c.getShaahZmanisBasedZman(c.getSunriseOffsetByDegrees(106.02), c.getSunsetOffsetByDegrees(106.02), 4);
            case "itimNoon": return c.getShaahZmanisBasedZman(rise, set, 6);
            case "itimMidnight": return ComplexZmanimCalendar.getTimeOffset(c.getShaahZmanisBasedZman(rise, set, 6), 12 * 3600000);
            case "itimTzaisChazonIsh": return c.getSunsetOffsetByDegrees(99.28);
            case "itimMinchaGedola":
                Date seasonal = c.getShaahZmanisBasedZman(rise, set, 6.5);
                Date fixed = ComplexZmanimCalendar.getTimeOffset(c.getShaahZmanisBasedZman(rise, set, 6), 1800000);
                return seasonal == null || fixed == null ? null : (seasonal.after(fixed) ? seasonal : fixed);
            default: return (Date)c.getClass().getMethod(method).invoke(c);
        }
    }
    public static void main(String[] args) throws Exception {
        String[] date = args[0].split("-");
        TimeZone tz = TimeZone.getTimeZone(args[4]);
        GeoLocation location = new GeoLocation("Reference", Double.parseDouble(args[1]), Double.parseDouble(args[2]), Double.parseDouble(args[3]), tz);
        ComplexZmanimCalendar cal = new ComplexZmanimCalendar(location);
        cal.setAstronomicalCalculator(new NOAACalculator());
        cal.setUseElevation(Boolean.parseBoolean(args[5]));
        cal.setCandleLightingOffset(Double.parseDouble(args[6]));
        cal.getCalendar().clear();
        cal.getCalendar().set(Integer.parseInt(date[0]), Integer.parseInt(date[1]) - 1, Integer.parseInt(date[2]));
        for (int i = 7; i < args.length; i++) {
            try {
                Date time = time(cal, args[i]);
                System.out.println(args[i] + "=" + (time == null ? "null" : time.getTime()));
            } catch (NoSuchMethodException ex) {
                System.out.println(args[i] + "=unsupported");
            }
        }
    }
}

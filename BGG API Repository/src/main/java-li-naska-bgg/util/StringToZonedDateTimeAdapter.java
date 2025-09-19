package li.naska.bgg.util;

import jakarta.xml.bind.annotation.adapters.XmlAdapter;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public class StringToZonedDateTimeAdapter extends XmlAdapter<String, ZonedDateTime> {

  /** Example : 2020-01-11T11:15:53+00:00 */
  private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

  @Override
  public String marshal(ZonedDateTime zonedDateTime) {
    return zonedDateTime.format(FORMATTER);
  }

  @Override
  public ZonedDateTime unmarshal(String string) {
    return ZonedDateTime.from(FORMATTER.parse(string));
  }
}

/**
 * Forums "New Post" / create discussion - WebView of website's create-post page.
 * Same destination as the "New Post" button on the forums page.
 */
import WebViewScreen from '../../components/WebViewScreen';

export default function ForumsCreatePost() {
  return <WebViewScreen path="/forums/create-post" title="New Post" />;
}

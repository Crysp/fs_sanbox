import React from 'react'
import {
    Platform,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
} from 'react-native'
import {
    Container,
    Content,
    Item,
    Input,
    Button,
    Text,
    Grid,
    Row,
    Col,
} from 'native-base'
import { Base64 } from 'js-base64'
import RNFetchBlob from 'rn-fetch-blob'
import fileType from 'file-type'

interface File {
    uri: string;
    mime: string | undefined;
}
interface AppState {
    files: File[];
    url: string;
}

export default class App extends React.Component<any, AppState> {
    readonly state = {
        files: [],
        url: '', // https://placeimg.com/640/480/animals
    };
    private static rootDir = `${RNFetchBlob.fs.dirs.DocumentDir}`;
    async componentDidMount() {
        const systemFiles = await RNFetchBlob.fs.ls(App.rootDir);
        const filesPending = systemFiles.map(async (fileName: string): Promise<File> => {
            const uri = `${App.rootDir}/${fileName}`;
            const mime = await getMimeType(uri);
            return { uri, mime };
        });
        const files = await Promise.all(filesPending);
        // @ts-ignore
        this.setState({ files });
    }
    onChangeUrl = (url: string) => this.setState({ url });
    onAddPicture = async () => {
        const {
            url,
            files,
        } = this.state;
        const result = await RNFetchBlob
            .config({
                fileCache: true
            })
            .fetch('GET', url);
        const uri = result.path();
        const mime = await getMimeType(uri);
        this.setState({
            files: [
                ...files,
                { uri, mime }
            ]
        });
    };
    onOpenFile = (file: File) => {
        if (Platform.OS === 'ios') {
            RNFetchBlob.ios.openDocument(file.uri);
        } else {
            RNFetchBlob.android.actionViewIntent(file.uri, file.mime);
        }
    };
    renderItem = ({ item }: any) => {
        const uri = Platform.OS === 'ios' ? item.uri : `file://${item.uri}`;
        return (
            <TouchableOpacity style={styles.item} onPress={() => this.onOpenFile(item)}>
                <Image resizeMode="cover" source={{ uri }} style={styles.picture}/>
            </TouchableOpacity>
        );
    };
    render() {
        const { url, files } = this.state;
        const filtered = files.reduce((memo: File[], file: File) => {
            if (file.mime) {
                memo.push(file);
            }
            return memo;
        }, []);
        return (
            <Container>
                <Content padder>
                    <Grid>
                        <Row>
                            <Col style={styles.input}>
                                <Item regular>
                                    <Input placeholder="Picture URL" value={url} onChangeText={this.onChangeUrl}/>
                                </Item>
                            </Col>
                            <Col style={styles.action}>
                                <Button block style={styles.button} onPress={this.onAddPicture}>
                                    <Text>Add</Text>
                                </Button>
                            </Col>
                        </Row>
                        <Row>
                            <FlatList
                                numColumns={3}
                                data={filtered}
                                keyExtractor={(item: File) => item.uri}
                                renderItem={this.renderItem}
                            />
                        </Row>
                    </Grid>
                </Content>
            </Container>
        );
    }
}

const styles = StyleSheet.create({
    input: {
        flex: .6,
        paddingRight: 4,
    },
    action: {
        flex: .4,
        paddingLeft: 4,
    },
    button: {
        flex: 1,
    },
    item: {
        flex: 1,
        height: 100,
        padding: 4,
    },
    picture: {
        width: '100%',
        height: '100%',
    },
});

async function getMimeType(uri: string) {
    const blob = await RNFetchBlob.fs.readFile(uri, 'base64');
    // todo: ios bug
    if (!blob) return void(0);
    const data = CovertBase64ToArrayBuffer(blob);
    const type = fileType(new Uint8Array(data));
    return type ? type.mime : void(0);
}

function CovertBase64ToArrayBuffer(data: string): ArrayBuffer {
    let UTF8Data = Base64.atob(data);
    let UTF8DataLength = UTF8Data.length;

    let bytes = new Uint8Array(UTF8DataLength);

    for (let i = 0; i < UTF8DataLength; i++) {
        bytes[i] = UTF8Data.charCodeAt(i);
    }

    return bytes.buffer;
}